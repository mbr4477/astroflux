import * as React from 'react';
import Home from './app/home/Home';
import TitleBar from './app/title/TitleBar';

// a very simple React component
// i've defined it as a component instead
// of a function component to be more realistic
class App extends React.Component<any, any> {
    render() {
        return (
            <>
                <Home/>
                <TitleBar title={'Astroflux'}/>
            </>
        )
    }
}

export default App;