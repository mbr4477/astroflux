import numpy as np
import matplotlib.pyplot as plt
from astropy.io import fits
from astropy.visualization.wcsaxes.frame import EllipticalFrame
from astropy.coordinates import SkyCoord, AltAz, EarthLocation, ICRS
from astropy import units as u
from astropy.time import Time
from astropy.wcs import WCS
from scipy.signal import convolve2d

class SkyMap(object):
    """ Abstract sky map class. """
    def get_temp_mk(self, ra_dec_samples):
        """
        Parameters
        ----------
        ra_dec_samples : Nx2 matrix of (ra, dec) coordinates to sample from

        Returns
        -------
        pixel_temps : Nx1 matrix of pixel temperatures in mK
        """
        pass

class FITSSkyMap(SkyMap):
    """
    A FITS sky map utility.
    """
    def __init__(self, fits_path):
        """
        Parameters
        ----------
        fits_path : str
            path to FITS sky file
        """
        f = fits.open(fits_path)[1]
        self.image_data = f.data
        self.w = WCS(f.header)

    def get_temp_mk(self, ra_dec_samples):
        """
        Parameters
        ----------
        ra_dec_samples : ndarray
            Nx2 matrix of (ra, dec) coordinates to sample from

        Returns
        -------
        pixel_temps : ndarray
            Nx1 matrix of pixel temperatures in mK
        """
        targets = SkyCoord(ra_dec_samples[:,0]*u.degree, ra_dec_samples[:,1]*u.degree)
        coordspix = np.array(targets.to_pixel(self.w)).T
        idx = np.floor(coordspix).astype(int)
        image = self.image_data[idx[:,1], idx[:,0]]
        return image

class CrossSky(SkyMap):
    """ A debug sky that always shows a cross. """
    def get_temp_mk(self, ra_dec_samples):
        N = int(np.sqrt(ra_dec_samples.shape[0]))
        image = np.zeros((N,N))
        image[:] = 0.0
        image[int(N/4):int(3*N/4),int(N/2-2):int(N/2+2)] = 1
        image[int(N/2-2):int(N/2+2), int(N/4):int(3*N/4)] = 1
        return image.reshape(-1)
    
class StarSky(SkyMap):
    """ A debug sky that always shows a star field. """
    def __init__(self, N):
        """
        Parameters
        ----------
        N : int
            image dimension
        """
        image = np.zeros((N,N))
        image[:] = 0.0
        for _ in range(5):
            pos = np.random.rand(2)*N
            image[int(pos[0]), int(pos[1])] = 1
        self.image = image

    def get_temp_mk(self, ra_dec_samples):
        return self.image.reshape(-1)

class Observation(object):
    def __init__(self, ra, dec, lat, lon, timestamp, duration=0):
        """
        Parameters
        ----------
        ra : float
            RA coordinate of target in degrees

        dec : float
            DEC coordinate of target in degrees

        lat : float
            latitude in degrees

        lon : float
            longitude in degrees

        timestamp : str
            ISO 8601 date-time string

        duration: float
            observation length in hours
        """
        self.ra = ra
        self.dec = dec
        self.lat = lat
        self.lon = lon
        self.timestamp = timestamp
        self.duration = duration

    def alt_az(self):
        """
        Returns
        -------
        alt_az : ndarray
            1x2 matrix of (alt, az) coordinates
        """
        return convert_ra_dec_to_alt_az(
            np.array([[self.ra, self.dec]]),
            self.lat,
            self.lon,
            self.timestamp
        )

def parabolic_beamwidth(dishsize, wavelength, degrees=False):
    """
    Calculate the beamwidth of a parabolic dish.
    
    Parameters
    ----------
    dishsize : float
        diameter of dish in meters

    wavelength : float
        wavelength in meters

    degrees : bool
        if `True` return beamwidth in degrees, else radians

    Returns
    -------
    beamwidth : float
        beamwidth in radians or degrees
    """
    beamwidth = wavelength / dishsize
    return beamwidth if not degrees else beamwidth / np.pi * 180

def generate_alt_az_samples(beamwidth_deg, alt, az, samples_per_dim):
    """
    Parameters
    ----------
    beamwidth_deg : float
        antenna beamwidth in degrees

    alt : float
        altitude in degrees

    az : float
        azimuth in degrees

    samples_per_dim : int
        samples per dimension

    Returns
    -------
    alt_az_samples : ndarray
        samples_per_dim^2 x 2 matrix of (alt, az) 
        coordinates in degrees
    """
    alts = np.arange(-0.5, 0.5, 1/samples_per_dim) * beamwidth_deg + alt
    azs = alts.copy() - alt + az
    AL,AZ = np.meshgrid(alts,azs)
    alt_az_samples = np.stack((AL.reshape(-1), AZ.reshape(-1)), axis=1)
    return alt_az_samples

def convert_alt_az_to_ra_dec(alt_az_samples, lat, lon, timestamp):
    """
    Parameters
    ----------
    alt_az_samples : ndarray
        Nx2 matrix of (alt, az) coordinates in degrees

    Returns
    -------
    ra_dec_samples : ndarray
        Nx2 matrix of (ra, dec) coordinates
    """
    location = EarthLocation(
        lat=lat*u.degree, 
        lon=lon*u.degree, 
        height=0
    )
    coords = AltAz(
        alt=alt_az_samples[:,0]*u.degree, 
        az=alt_az_samples[:,1]*u.degree, 
        obstime=Time(timestamp), 
        location=location
    )
    coords = coords.transform_to(ICRS())
    return np.array([coords.ra.degree, coords.dec.degree]).T

def convert_ra_dec_to_alt_az(ra_dec_samples, lat, lon, timestamp):
    """
    Parameters
    ----------
    ra_dec_samples : ndarray
        Nx2 matrix of (ra, dec) coordinates in degrees

    lat : float
        latitude of observation in degrees

    lon : float
        longitude of observation in degrees

    timestamp : str
        ISO 8601 date-time string of observation

    Returns
    -------
    alt_az_samples : ndarray
        Nx2 matrix of (alt, az) coordinates in degrees
    """
    c = SkyCoord(ra=ra_dec_samples[:,0]*u.degree, dec=ra_dec_samples[:,1]*u.degree, frame='icrs')
    location = EarthLocation(lat=lat*u.degree, lon=lon*u.degree, height=0)
    aa = c.transform_to(AltAz(obstime=Time(timestamp), location=location))
    return np.array([aa.alt.degree, aa.az.degree]).T

def create_antenna_beam_lm_samples(beamwidth_deg, samples_per_dim):
    """
    Parameters
    ----------
    beamwidth_deg : float
        beamwidth of the antenna in degrees

    Returns
    -------
    lm_grid_samples : ndarray
        samples_per_dim^2 x 2 matrix of (l,m) direction cosine 
        pairs for the given beamwidth
    """
    l = np.arange(-0.5, 0.5, 1/samples_per_dim) * beamwidth_deg / 90
    m = l.copy()
    L,M = np.meshgrid(l,m)
    lm = np.stack((L.reshape(-1), M.reshape(-1)), axis=1)
    return lm


def generate_antenna_signals(antenna_xy, antenna_beam_lm_samples, pixelvalues, wavelength, snr=None, samples=1):
    """ 
    Parameters
    ----------
    antenna_xy : ndarray
        J x 2 matrix of positions

    antenna_beam_lm_samples : ndarray
        N^2 x 2 matrix of sampled direction cosine 
        lm grid points for individual dish beam

    pixelvalues : ndarray
        N^2 x 1 matrix of pixel values corresponding to the sampled lm plane

    wavelength : float
        wavelength in meters

    snr : float | None
        signal-to-noise-ratio of the sky data or None if no noise

    samples : int
        number of samples to average for this short term interval

    Returns
    -------
    antenna_signals : ndarray
        Jx1 vector of antenna output (assume heterodyned)
    """
    # normalize the pixel values
    px = (pixelvalues - np.amin(pixelvalues)) / (np.amax(pixelvalues) - np.amin(pixelvalues))
    if snr:
        noisepower = 10**(-snr/20)
        noisemag = np.sqrt(noisepower)
        dynamic_range = 4*noisemag
        offset = dynamic_range*0.5
        withnoise = np.zeros(px.shape)
        for i in range(samples):
            noise = np.random.randn(px.shape[0])*noisemag
            withnoise += np.abs(np.round((px + noise) / dynamic_range))
        px = withnoise / samples

    phase_delays = 2*np.pi*antenna_beam_lm_samples.dot(antenna_xy.T/wavelength)
    phase_delays = np.exp(-1j * phase_delays)
    rx = phase_delays.T.dot(px)
    rx = rx.reshape(rx.shape[0],1)
    return rx
    
def xcorr_signals(signals):
    """
    Parameters
    ----------
    signals : ndarray
        JxM vector of stacked input signals

    Returns
    -------
    xcorr_matrix : ndarray
        JxJ matrix of cross correlation results
    """
    xcorr = signals.dot(signals.conj().T)
    return xcorr

def propagate_antennas(antenna_xy, elapsed):
    """
    Parameters
    ----------
    antenna_xy : ndarray
        Jx2 matrix of antenna (x,y) positions

    duration : float
        hours to propagate

    Returns
    -------
    antenna_xy : ndarray
        Jx2 matrix of propagated positions
    """
    angle = elapsed / 24 * 2*np.pi
    s,c = np.sin(angle), np.cos(angle)
    rotmat = np.array(((c, -s),(s, c)))
    return antenna_xy.dot(rotmat)

def to_uv(antenna_xy, wavelength):
    """
    Parameters
    ----------
    antenna_xy : ndarray
        Jx2 matrix of antenna (x,y) positions

    wavelength : float
        observation wavelength in meters

    Returns
    -------
    uv_baselines : ndarray
        J^2 x 2 matrix of baseline vectors
    """
    X = np.repeat(
        antenna_xy[:,0].reshape(antenna_xy.shape[0],1), 
        antenna_xy.shape[0], 
        axis=1
    )
    Y = np.repeat(
        antenna_xy[:,1].reshape(antenna_xy.shape[0],1),
        antenna_xy.shape[0], 
        axis=1
    )
    u = (X-X.T).reshape(-1)/wavelength
    v = (Y-Y.T).reshape(-1)/wavelength
    uv = np.stack((u,v), axis=1)
    return uv

def simulate(observation, axy, beamwidth, wavelength, skymap, samples_per_dim=64, snr=None, samples=1):
    """
    Parameters
    ----------
    observation : Observation
        `Observation` object

    axy : ndarray
        Jx2 array of antenna (x,y) positions

    beamwidth : float
        antenna beamwidth in degrees

    wavelength : float
        wavelength in meters

    skymap : SkyMap
        `SkyMap` object

    samples_per_dim : int
        samples per dim of alt/az grid

    snr : float | None
        signal to noise ratio in dB

    samples : int
        samples to use in each short-term interval

    Returns
    -------
    signals : ndarray   
        a JxM matrix of noiseless stacked antenna signals from the skymap

    pixeldata : ndarray
        samples_per_dim^2 length vector of pixel values
    """
    target_alt_az = observation.alt_az().squeeze()
    alt_az_samples = generate_alt_az_samples(
        beamwidth, 
        target_alt_az[0], 
        target_alt_az[1],
        samples_per_dim
    )
    ra_dec_samples = convert_alt_az_to_ra_dec(
        alt_az_samples, 
        observation.lat, 
        observation.lon, 
        observation.timestamp
    )
    pixeldata = skymap.get_temp_mk(ra_dec_samples)
    beamsamples = create_antenna_beam_lm_samples(
        beamwidth, 
        samples_per_dim=samples_per_dim
    )
    rx = generate_antenna_signals(axy, beamsamples, pixeldata, wavelength, snr, samples)
    return rx, pixeldata

def compute_dirty_image_pixels(xcorr, uv, lm):
    """
    Parameters
    ----------
    xcorr : ndarray
        J^2 vector of antenna signal cross correlations

    uv    : ndarray
        J^2 x 2 matrix of baseline vectors

    lm    : ndarray
        N^2 x 2 matrix of (l,m) points

    Returns
    -------
    pixelvalues : ndarray
        N^2 vector of s plane pixel values
    """
    zdots = uv.dot(lm.T)
    result = xcorr.reshape(1,xcorr.shape[0]).dot(np.exp(1j*2*np.pi*zdots))
    return result

def compute_dirty_image(uv, xcorr, imwidth, samples_per_dim):
    """
    Parameters
    ----------
    uv : ndarray
        J^2 x 2 matrix of (u,v) baselines

    xcorr : ndarray
        J^2 x 1 matrix of cross correlations

    imwidth : float
        image beamwidth in degrees
    
    samples_per_dim : int
        samples per dimension of the image

    Returns
    -------
    image : ndarray
        (samples_per_dim x samples_per_dim) dirty image
    """
    lm = create_antenna_beam_lm_samples(imwidth, samples_per_dim)
    image = compute_dirty_image_pixels(xcorr, uv, lm)
    return image.reshape(samples_per_dim, samples_per_dim)

def dirty_beam(uvs, beamwidth, samples_per_dim):
    """
    Parameters
    ----------
    uvs : mdarray
        tuple of (J^2 x 2) sets of (u,v) baselines from J antennas
    
    beamwidth : float
        beamwidth in degrees

    samples_per_dim : int
        samples per dimension for beam image

    Returns
    -------
    dirty_beam : ndarray
        samples_per_dim x samples_per_dim dirty beam
    """
    N = samples_per_dim
    dirty = compute_dirty_image(uvs, np.ones(uvs.shape[0]), beamwidth, N)
    dirty = np.abs(dirty)
    dirty /= np.amax(dirty)
    return dirty

def clean(image, uvs, beamwidth, synthetic_bw, iters=100, lmbda=0.1):
    """
    Parameters
    ----------
    image : ndarray
        the NxN complex image matrix to CLEAN 
        (must be even integer width and height)

    uvs : ndarray
        tuple of (J^2 x 2) sets of (u,v) baselines from J antennas
    
    beamwidth : float
        beamwidth in degrees

    synthetic_bw : float
        estimated beamwidth of synthetic aperture

    iters : int
        number of CLEAN iterations

    lmbda : float
        weighting parameter (CLEANing "rate")

    Returns
    -------
    cleaned_image : ndarray
        NxN CLEANed image
    """
    N = image.shape[0]
    dirty = dirty_beam(uvs, beamwidth*2, image.shape[0]*2)
    image = np.abs(image)
    image /= np.amax(image)

    padded_image = np.zeros((N*3,N*3))
    padded_image[int(N):int(2*N), int(N):int(2*N)] = np.abs(image)
    point_sources_map = np.zeros((N,N))

    for _ in range(iters):
        image = padded_image[int(N):int(2*N), int(N):int(2*N)]
        flattened_idx = np.argmax(np.abs(image))
        maxval = image.reshape(-1)[flattened_idx]
        row = int(flattened_idx / N)
        col = flattened_idx % N
        point_sources_map[row, col] += lmbda*maxval
        padded_image[int(row):int(row+2*N), int(col):int(col+2*N)] -= lmbda*maxval*dirty

    residuals = padded_image[int(N):int(2*N), int(N):int(2*N)]
    X,Y = np.meshgrid(np.arange(0,N)/N-0.5, np.arange(0,N)/N-0.5)
    gaussian_beam = np.exp(-(X**2 + Y**2)/(2*((synthetic_bw/beamwidth)**2)))
    im = convolve2d(point_sources_map, gaussian_beam, mode='same')

    return np.abs(im)

