import React from 'react';

export function Sticky(props: {}) {
    return (
        <div className="sticky">
            <h2>Sticky</h2>
            <video src="/sticky.mp4" autoPlay={true} loop={true}/>
        </div>
    );
}