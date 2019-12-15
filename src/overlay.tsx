import React, { ReactNode} from 'react';
import Scrollbar from 'react-scrollbar';

import "./overlay.css";

export interface OverlayProps {
    onCloseClicked(): void;
}

interface OverlayState {
    show: boolean;
    children: ReactNode | null;
}

export class Overlay extends React.Component<OverlayProps, OverlayState> {

    private ref?: Scrollbar;

    state = {
        show: false,
        children: null
    };

    componentDidUpdate(prevProps: Readonly<React.PropsWithChildren<OverlayProps>>, prevState: Readonly<OverlayState>, snapshot?: any): void {
        if(prevProps.children !== this.props.children) {
            const show = this.props.children !== null;
            if(show && this.ref) {
                this.ref.scrollYTo(0);
            }
            this.setState({show});
            if(this.props.children) {
                this.setState({children: this.props.children});
            }
        }
    }

    private readonly onCloseClicked = () => {
        this.props.onCloseClicked();
    };

    private readonly setRef = (r: Scrollbar) => {
        this.ref = r || undefined;
    };

    render() {
        const {show, children} = this.state;
        return (
            <div className={"overlay-wrapper " + (show ? "show-animate" : "hide-animate")}>
                <div className="overlay">
                    <div className="overlay-close" onClick={this.onCloseClicked}>X</div>
                    <Scrollbar
                        className="overlay-scrollbar"
                        contentClassName="overlay-content"
                        ref={this.setRef}
                        smoothScrolling={true}
                    >
                        {children}
                    </Scrollbar>
                </div>
            </div>
        );
    }
}