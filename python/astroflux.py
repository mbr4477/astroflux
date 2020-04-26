import argparse
import json
import matplotlib.pyplot as plt
import numpy as np
from astropy.coordinates import SkyCoord, AltAz, EarthLocation, ICRS
from astropy import units as u
from astropy.time import Time
from astropy.wcs import WCS
from astropy.io import fits
from scipy.signal import convolve2d
import tempfile, os

import astrofluxlib as aflux

import sys
    
def main():
    parser = argparse.ArgumentParser(description='A CLI for running radio interferometry simulations')
    parser.add_argument('--sky', type=str, help='"cross" | "stars" | path to FITS sky map file', required=True)
    parser.add_argument('--json', type=str, help='JSON input string')
    parser.add_argument('--file', type=str, help='path to observation JSON input file')
    parser.add_argument('--duration', type=float, help='observation duration in hours')
    parser.add_argument('--samples', type=int, help='number of samples per short term interval')
    parser.add_argument('--snr', type=float, help='SNR of antenna signals')
    parser.add_argument('--fast', action='store_true', help='simulate all antennas with the parameters')
    parser.add_argument('--spiral', metavar='RADIUS', type=float, help='generate spiral array with this max radius in meters')
    parser.add_argument('--random', metavar='RADIUS', type=float, help='generate random array positions on this order')
    parser.add_argument('--count', metavar='NUM_ANTENNAS', type=int, help='number of antennas for generated array')
    parser.add_argument('--size', metavar='DISH_SIZE', type=float, help='size of generate dishes')
    parser.add_argument('--save', type=str, help='save generated configuration to this output path')
    parser.add_argument('--dump', action='store_true', help='dump output as JSON string in stdout')
    args = parser.parse_args()

    # parse the input json string or file
    input_data = None
    if args.json:
        input_data = json.loads(args.json)
    elif args.file:
        with open(args.file, 'r') as f:
            input_data = json.loads(f.read())
    else:
        print("No input")
        sys.exit(1)
        
    wavelength = input_data['wavelength']
    bandwidth = input_data['bandwidth']
    samplingRate = input_data['samplingRate']

    antenna_xy = np.zeros((len(input_data['antennas']), 2))
    antenna_sizes = np.zeros(antenna_xy.shape[0])
    antenna_eta = np.zeros(antenna_xy.shape[0])

    # create the antenna array
    if args.random:
        antenna_xy = (np.random.rand(args.count, 2) - 0.5) * args.random
        antenna_sizes[:] = args.size if args.size else 3
        antenna_eta[:] = 0.5
    elif args.spiral:
        t = (np.arange(args.count)+1) / args.count
        logarg = t
        antenna_xy = np.zeros((args.count, 2))
        antenna_xy[:,0] = args.spiral*np.log(logarg)*np.cos(t*4*np.pi)/2
        antenna_xy[:,1] = args.spiral*np.log(logarg)*np.sin(t*4*np.pi)/2
        antenna_sizes[:] = args.size if args.size else 3
        antenna_eta[:] = 0.5
    else:
        for i, a in enumerate(input_data['antennas']):
            antenna_xy[i,0] = a['x']
            antenna_xy[i,1] = a['y']
            antenna_sizes[i] = a['size']
            antenna_eta[i] = a['eta']

    if args.save:
        input_data['antennas'] = list(map(
            lambda axy: {
                'x': axy[0],
                'y': axy[1],
                'size': antenna_sizes[0],
                'eta': antenna_eta[0]
            },
            antenna_xy
        ))
        with open(args.save, 'w') as f:
            f.write(json.dumps(input_data, sort_keys=True, indent=2))

    observation = aflux.Observation(
        input_data['target']['ra'],
        input_data['target']['dec'],
        input_data['latitude'],
        input_data['longitude'],
        input_data['timestamp'],
        args.duration if args.duration else input_data['duration']
    )

    DURATION_STEP = 0.1 # 6 minutes

    image_size = 64

    # create the desired skymap
    skymap = None
    if args.sky == 'cross':
        skymap = aflux.CrossSky()
    elif args.sky == 'stars':
        skymap = aflux.StarSky(image_size)
    else:
        skymap = aflux.FITSSkyMap(args.sky)

    # figure out the beamwidths of each antenna
    beamwidths = aflux.parabolic_beamwidth(antenna_sizes, wavelength, degrees=True)

    image = np.zeros((image_size, image_size), dtype=complex)
    all_uv = []
    all_xcorr = []
    for elapsed in np.arange(0, observation.duration, DURATION_STEP):
        current_xy = aflux.propagate_antennas(antenna_xy, elapsed)
        current_uv = aflux.to_uv(current_xy, wavelength)
        all_uv.append(current_uv)
        signals = []
        if args.fast:
            signals, pixeldata = aflux.simulate(
                observation, 
                current_xy, 
                beamwidths[0],
                wavelength, 
                skymap,
                samples_per_dim=image_size,
                snr=args.snr,
                samples=args.samples if args.samples else 1
            )
        else:
            for (axy, bw, eta) in zip(current_xy, beamwidths, antenna_eta):
                axy = np.expand_dims(axy, axis=0)
                rx, pixeldata = aflux.simulate(
                    observation, 
                    axy, 
                    bw,
                    wavelength, 
                    skymap,
                    samples_per_dim=image_size,
                    snr=args.snr,
                    samples=args.samples if args.samples else 1
                )
                signals.append(rx)
            signals = np.stack(signals, axis=0)

        xcorr = aflux.xcorr_signals(signals)
        all_xcorr.append(xcorr.reshape(-1))
        
    all_xcorr = np.concatenate(all_xcorr)
    all_uv = np.concatenate(all_uv, axis=0)

    # find the dirty image
    image = aflux.compute_dirty_image(
        all_uv, 
        all_xcorr, 
        np.amax(beamwidths), 
        samples_per_dim=image_size
    )

    # figure out the estimated synthetic beamwidth
    norms = current_uv.dot(current_uv.T)
    max_baseline = np.sqrt(np.amax(norms))*wavelength
    synthetic_bw = aflux.parabolic_beamwidth(max_baseline, wavelength, degrees=True)

    # find the dirty beam
    dirty_beam = aflux.dirty_beam(all_uv, np.amax(beamwidths)*2, image_size*2)
    
    # CLEAN
    lmbda = 0.05
    iters = 1000
    cleaned = aflux.clean(image, all_uv, np.amax(beamwidths), synthetic_bw, iters, lmbda)
    image = np.abs(image)

    # ---- COMPARISON ---- #
    # compare_size = image_size
    # uv_image = np.zeros((compare_size, compare_size))
    # max_dim = np.amax(np.abs(all_uv))
    # for i in range(all_uv.shape[0]):
    #     pos = (all_uv[i,:]/max_dim * compare_size/2)
    #     uv_image[int(compare_size/2 - pos[1] - 1), int(pos[0] + compare_size/2) - 1] += 1.0
    # plt.figure(2, figsize=(8,8))
    # plt.subplot(221)
    # plt.imshow(uv_image, cmap='Greys')
    # db = np.fft.fft2(uv_image)
    # plt.subplot(222)
    # plt.imshow(np.abs(np.fft.fftshift(db)), cmap='gray')
    # di = np.fft.ifft2(uv_image * np.fft.fftshift(np.fft.fft2(pixeldata.reshape(image_size, image_size))))
    # plt.subplot(223)
    # plt.imshow(np.abs(di), cmap='gray')
    # clnd = aflux.clean(di, all_uv, np.amax(beamwidths), synthetic_bw, iters, lmbda)
    # plt.subplot(224)
    # plt.imshow(np.abs(clnd), cmap='gray')
    # -------------------- #
    
    if args.dump:
        outdir = tempfile.gettempdir()
        out = {
            'cleanPath': os.path.join(outdir, 'clean.jpg'),
            'skyPath': os.path.join(outdir, 'sky.jpg'),
            'dirtyBeamPath': os.path.join(outdir, 'dirtyBeam.jpg'),
            'dirtyImagePath': os.path.join(outdir, 'dirtyImage.jpg'),
            'uvPath': os.path.join(outdir, 'uv.jpg'),
        }
        plt.figure()
        plt.imshow(pixeldata.reshape(image_size,image_size), cmap='gray')
        plt.axis('off')
        plt.title('Source Image')
        plt.savefig(out['skyPath'])

        plt.imshow(cleaned, cmap='gray')
        plt.title('CLEANed Image')
        plt.axis('off')
        plt.savefig(out['cleanPath'])

        plt.imshow(image, cmap='gray')
        plt.title('Dirty Image')
        plt.axis('off')
        plt.savefig(out['dirtyImagePath'])

        plt.imshow(dirty_beam, cmap='gray')
        plt.title('Dirty Beam')
        plt.axis('off')
        plt.savefig(out['dirtyBeamPath'])
        plt.figure()
        ax = plt.gca()
        plt.scatter(all_uv[:,0], all_uv[:,1], color='k', marker='.')
        plt.title('uv Plane')
        ax.set_aspect('equal')
        plt.title('uv Plane')
        plt.xlabel('u [wavelengths]')
        plt.ylabel('v [wavelengths]')
        ax.grid()
        plt.savefig(out['uvPath'])
        print(json.dumps(out))
    else:
        # visualizations
        plt.figure(figsize=(10,10))
        ax = plt.subplot(231)
        plt.scatter(antenna_xy[:,0], antenna_xy[:,1], color='k', marker='x')
        ax.set_aspect('equal')
        plt.title('xy Plane')
        plt.xlabel('x [meters]')
        plt.ylabel('y [meters]')
        ax.grid()
        ax = plt.subplot(232)
        plt.scatter(all_uv[:,0], all_uv[:,1], color='k', marker='.')
        ax.set_aspect('equal')
        plt.title('uv Plane')
        plt.xlabel('u [wavelengths]')
        plt.ylabel('v [wavelengths]')
        ax.grid()
        plt.subplot(233)
        plt.imshow(pixeldata.reshape(image_size,image_size), cmap='gray')
        plt.title('Source Image (BW = {:.1f} deg)'.format(np.amax(beamwidths)))
        plt.xlabel('Azimuth')
        plt.ylabel('Altitude')
        plt.axis('off')
        plt.subplot(234)
        plt.imshow(np.abs(dirty_beam), cmap='gray')
        plt.axis('off')
        plt.title('Dirty Beam (BW = {:.1f} deg)'.format(np.amax(beamwidths)*2))
        plt.xlabel('Azimuth')
        plt.ylabel('Altitude')
        plt.subplot(235)
        plt.imshow(np.abs(image), cmap='gray')
        plt.axis('off')
        plt.title('Dirty Image (BW = {:.1f} deg)'.format(np.amax(beamwidths)))
        plt.xlabel('Azimuth')
        plt.ylabel('Altitude')
        plt.subplot(236)
        plt.imshow(np.abs(cleaned), cmap='gray')
        plt.axis('off')
        plt.title('CLEANed ({:d} iters, lambda={:.2f})'.format(iters, lmbda))
        plt.xlabel('Azimuth')
        plt.ylabel('Altitude')
        plt.tight_layout(pad=4.0)
        plt.show()

if __name__ == '__main__':
    main()