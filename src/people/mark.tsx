import React from 'react';

export function Mark(props: {}) {
    return (
        <div className="mark">
            <h2>Mark</h2>
            <audio src="/mark.mp3" controls={true}/>
        </div>
    );
}