import React from 'react';

function decrypt(text: number[], key: string) {
    const out = [];
    let index = 0;
    for(const i of text) {
        let cipher = i ^ key.charCodeAt(index);
        index = (index + 1) % key.length;
        out.push(String.fromCharCode(cipher));
    }
    return out.join("");
}

const t = [126,45,4,12,1,73,7,28,84,24,76,22,2,12,13,6,21,21,76,0,10,29,28,14,84,20,9,22,1,8,9,10,84,13,3,69,11,6,27,79,32,0,0,0,0,69,78,13,17,26,13,16,1,12,78,7,27,23,9,22,6,5,23,79,61,89,24,13,27,7,5,79,13,22,25,66,0,12,78,27,28,28,76,7,23,26,26,79,0,17,5,11,21,73,26,7,21,13,76,44,85,31,11,79,19,24,5,11,23,13,78,9,6,22,1,69,61,63,47,79,27,15,9,23,82,29,6,10,84,21,13,22,6,73,26,24,27,89,21,0,19,27,29,65,126,46,9,66,22,73,15,3,3,24,21,22,82,11,11,10,26,89,10,23,27,12,0,11,7,89,31,12,28,10,11,79,0,17,9,69,1,29,15,29,0,89,10,10,0,73,29,26,6,28,64,69,59,78,10,79,21,21,27,4,11,26,78,3,29,18,9,1,82,29,6,10,84,31,13,6,6,73,23,0,1,89,27,0,0,12,78,14,24,10,3,69,20,27,1,2,84,13,4,0,82,26,15,2,17,89,15,12,6,16,78,14,7,89,1,0,94,73,12,26,0,89,5,17,82,30,15,28,26,94,24,69,7,7,26,6,24,89,4,4,30,15,78,24,21,0,76,17,26,27,1,26,19,17,76,17,26,0,29,79,13,28,13,23,120,29,6,14,0,89,27,0,82,11,11,12,27,20,9,69,23,26,30,10,23,16,13,9,30,16,78,12,24,22,31,0,82,15,28,6,17,23,8,22,92,99,38,0,26,28,31,17,30,16,78,11,1,29,9,69,19,29,78,27,28,16,31,69,2,6,7,1,0,89,37,69,5,6,27,3,16,89,31,4,11,73,23,0,1,94,30,0,82,6,0,10,84,22,10,69,31,16,78,12,24,22,31,0,1,29,78,9,6,16,9,11,22,26,78,14,26,29,76,44,85,31,11,79,22,28,9,11,82,26,11,29,29,22,25,22,30,16,78,10,26,19,3,28,27,7,9,79,0,17,9,69,6,0,3,10,84,14,9,66,4,12,78,28,4,28,2,17,82,29,1,8,17,13,4,0,0,73,1,25,17,11,76,17,26,12,78,3,21,10,24,69,68,73,1,29,84,10,3,69,31,6,0,27,28,10,66,111,43,6,27,72,6,28,76,4,82,27,11,14,24,21,21,69,17,6,1,3,84,9,9,23,1,6,0,67,84,28,26,0,28,73,7,9,84,0,3,16,82,4,15,22,84,23,3,17,82,29,6,6,26,18,76,22,29,73,23,0,1,11,31,0,30,15,64,79,61,89,0,10,4,12,78,7,21,23,11,12,28,14,78,0,1,13,64,69,2,5,15,22,29,23,11,69,21,8,3,10,7,85,76,15,7,26,26,79,19,28,2,0,0,8,2,3,13,89,24,4,30,2,7,1,19,89,13,7,29,28,26,79,21,21,0,69,1,6,28,27,7,89,3,3,82,29,6,6,26,30,31,75,120,32,78,4,26,22,27,69,1,1,7,27,7,89,3,7,4,0,1,26,7,21,21,69,28,6,26,79,22,28,9,11,82,12,15,28,13,89,10,10,0,73,23,0,1,85,76,7,7,29,78,38,84,31,9,0,30,73,28,10,21,21,0,28,82,1,15,31,4,0,76,17,29,73,26,7,29,23,7,69,6,1,15,27,84,48,75,19,23,73,12,10,17,23,76,4,16,5,11,79,0,22,76,13,23,5,30,79,13,22,25,69,22,12,15,3,84,14,5,17,26,73,29,0,25,28,76,10,20,73,26,7,17,89,27,10,0,26,26,79,27,31,76,12,6,71,100,41,27,11,76,17,26,12,78,9,1,13,25,23,23,69,78,38,83,20,76,9,29,6,5,6,26,30,76,3,29,27,25,14,6,29,76,17,29,73,25,7,17,23,76,18,23,73,25,10,84,26,13,11,82,11,1,27,28,89,31,21,23,8,5,79,0,22,76,0,19,10,6,79,27,13,4,0,0,73,24,6,21,89,26,10,27,10,11,67,84,24,2,1,82,8,2,28,27,89,1,4,11,11,11,79,25,28,9,17,27,7,9,79,1,9,76,22,29,4,11,79,16,24,21,69,95,73,39,79,28,24,26,0,82,29,6,10,84,31,30,12,23,26,78,12,27,12,2,17,82,8,0,11,84,48,76,21,30,8,0,79,27,23,76,1,23,5,7,25,17,11,5,11,21,73,1,1,84,16,24,73,82,4,15,29,31,89,1,28,82,30,1,29,16,10,66,111,59,78,3,79,6,16,8,12,17,28,2,0,1,10,0,28,82,14,2,14,16,89,24,10,82,1,15,25,17,89,21,10,7,73,15,28,84,24,76,3,0,0,11,1,16,87,76,49,26,8,0,4,84,0,3,16,82,15,1,29,84,28,26,0,0,16,26,7,29,23,11,75,120];

export function Deelon(props: {}) {

    const params = new URLSearchParams(window.location.search);
    let code = params.get("code");
    if(code) {
        code = decrypt(t, code);
    }

    return (
        <div className="deelon">
            <h2>Deelon</h2>
            <p>
                Good work on beating the Deelon boss. Here's your prize, you get to read my obviously amazing OVA message.
            </p>
            <p>
                So this is now year 2. We've managed to stay around for another year, which is absolutely fantastic mind you.
                I'm glad that regardless of what happens, the server does manage to continue on doing what it does.
            </p>
            <p>
                I can still remember the first time I played the ol' DDLC back in 2017. I'd come off my flight to PAX that year
                and I was sitting on a bench in Fitzroy Gardens in Melbourne watching MatPat stream the game on GTLive.
                I decided after a while to stop watching and play the thing myself instead because I could tell some shit was
                going to happen and I wanted to experience it for myself.<br/>
                So I did just that when I got into the hotel room later that day; fired up my laptop, downloaded DDLC (free shit hell yeah) and fired it up.
                I finished the game within about 2 days playing in the hotel room in the evening after PAX.<br/>
                One evening I even had just a little bit of trouble sleeping because I had Yuri's goddamn eyes imprinted on my brain.
            </p>
            <p>
                You bet I enjoyed it though, the game was exactly the kind of thing I love (4th wall breaks and horror).
                After returning home, I was checking the DDLC reddit and noticed the link to DDFC. I actually hadn't joined any
                public discord servers like that before, so this was my first time getting into a fandom like that.
            </p>
            <p>
                And damn it's a good thing I did because I met some of the most fantastic people I think I've ever my in my entire life.
                I'm really so glad I made that choice to join DDFC, which eventually led to OVA and GBS which have become the most defining places of my last two years.
                I've sure as hell spent a lot of time there and made some of the best friendships ever. I've certainly had a lot of fun in VCs, playing games, or just talking
                about random shit in chat.
            </p>
            <p>
                There's been a lot that's happened since we first formed 2 years ago, but we've still managed to stick together and endure above all else.
                I hope we continue to do so in the indefinite future because I think my life would be just a bit sadder without all of you.
            </p>
            <p>
                Thank you all for everything you've done, and thank you for being my friends for the last two years.
            </p>
            {code &&
                <p>{code}</p>
            }
            <p>Deelon</p>

        </div>
    );
}