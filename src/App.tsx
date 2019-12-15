import React from 'react';
import * as THREE from 'three';

import './App.css';
import {EffectComposer} from "three/examples/jsm/postprocessing/EffectComposer";
import {UnrealBloomPass} from "three/examples/jsm/postprocessing/UnrealBloomPass";
import {SMAAPass} from "three/examples/jsm/postprocessing/SMAAPass";
import {RenderPass} from "three/examples/jsm/postprocessing/RenderPass";
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader";
import {Player} from "./player";
import CameraMovement from "./camera";
import {Action, Input} from "./input";
import {UpdateList} from "./update";
import {Grid} from "./collision";
import {AttackMode, Enemy} from "./enemy";
import {Overlay} from "./overlay";
import {Range} from './utils';
import {Tyler} from "./people/tyler";
import {Aegwynn} from "./people/aeg";
import {AnyKey13} from "./people/any";
import {Blocky} from "./people/blocky";
import {Cal} from "./people/cal";
import {Dash} from "./people/dash";
import {Mark} from "./people/mark";
import {Mute} from "./people/mute";
import {Neel} from "./people/neel";
import {Snow} from "./people/snow";
import {Sticky} from "./people/stick";
import {Supa} from "./people/supa";
import {Vase} from "./people/vase";
import {Deelon} from "./people/deelon";
import {Arrow} from "./arrow";

interface AppState {
    message: JSX.Element | null;
    count: number;
    length: number;
    loading: number;
    maxToLoad: number;
    loaded: boolean;
    started: boolean;
}

/**
 * Player:
 *  - Flies around with WASD, aims with the mouse.
 *  - Camera follows player in addition to their cursor that they use to attack things
 *  - left click to fire projectiles at enemies. (green or white or something)
 *  - right click to fire a laser that shoots through all enemies infront (shader animation ye boi!)
 *  - Has 4 hp or so, 1 hp taken per enemy hit. When 0, respawn somewhere in the map.
 *
 * Enemies:
 *  - Box with our pfps on it
 *  - When close enough, fire projectiles back at the player (red)
 *  - When destroyed, game pauses for a moment and a message is shown with what the person said about ova for the 2nd year.
 *  - When all enemies are destroyed, a big one that fades between everyone's pfps shows up.
 *  - Big enemy pops up little snippets of everyone's messages as you fight it (lots of hp)
 *  - Fires bigger projectiles that one shot the player (big spheres) need to dodge!
 *  - When destroyed, explodes and sends out tonnes of little squares with our pfps on them.
 *
 * Final message from me at the end.
 */

const people = [
    {
        img: "/tyler_darker.png",
        quotes: [
            "I’d be glad that OVA lasted",
            "Take this moment to say thank you",
            "Fucking great friends",
            "Fucking great to be back",
            "See you cunts",
            "Typing shit is old news",
            "Y’all"
        ],
        message: <Tyler/>
    },
    {
        img: "/cal_darker.png",
        quotes: [
            "Ups and downs",
            "Notable events",
            "Whoever the fuck is reading is",
            "You’re all cool",
            "Here’s to another year",
            "*strider noises*"
        ],
        message: <Cal/>
    },
    {
        img: "/aeg_darker.png",
        quotes: [
            "A years worth of memories",
            "Stay for good",
            "Really love you guys",
            "Thank you all for a great year",
            "Don’t miss another moment"
        ],
        message: <Aegwynn/>
    },
    {
        img: "/any_darker.png",
        quotes: [
            "Hi it's me, any key",
            "I can't help but feel amazed",
            "Would genuinely love to meet you",
            "I love you, no homo",
            "Thank you for every fuck you said",
            "I am thankful",
            "You're all a part of me",
        ],
        message: <AnyKey13/>
    },
    {
        img: "/blocky_darker.png",
        quotes: [
            "Having fun no matter what",
            "You guys were always there",
            "The next decade and beyond",
            "Thank you everyone",
            "Make everyone around you smile",
            "Best of times my friends"
        ],
        message: <Blocky/>
    },
    {
        img: "/dash_darker.png",
        quotes: [
            "Charming place",
            "I love all of you",
            "<3",
            "Thank each & every one of you"
        ],
        message: <Dash/>
    },
    {
        img: "/mark_darker.png",
        quotes: [
            "Not much has changed",
            "Our community is steady",
            "I've been more active",
            "I'm happy this community is still there",
            "It's nice to have honestly",
            "You guys are why I use discord",
            "Take care everyone"
        ],
        message: <Mark/>
    },
    {
        img: "/mute_darker.png",
        quotes: [
            "Alright fellas listen up",
            "Gonna fucking wing it",
            "Big part of my life",
            "Tons of fantastic people",
            "Straight from the heart",
            "Fucking cool as shit"
        ],
        message: <Mute/>
    },
    {
        img: "/neel_darker.png",
        quotes: [
            "yo",
            "SL",
            "was sick",
            "when are",
            "we doing",
            "it again?"
        ],
        message: <Neel/>
    },
    {
        img: "/snow_darker.png",
        quotes: [
            "You all are special & dear to me",
            "lol akjdslksdf",
            "Hecc shiz",
            "Thoughtful, caring, funny, unique",
            "Thankies",
            "Known you guys for way longer"
        ],
        message: <Snow/>
    },
    {
        img: "/sticky_darker.mp4",
        quotes: [
            "",
            ""
        ],
        message: <Sticky/>
    },
    {
        img: "/supa_darker.png",
        quotes: [
            "Y’all are fucking great",
            "Best damn friends",
            "Nicest, funniest, coolest",
            "A total blast",
            "Meme it up",
            "Love y’all no homo"
        ],
        message: <Supa/>
    },
    {
        img: "/vase_darker.png",
        quotes: [
            "Nothing ever happened somehow",
            "I think you are cool",
            "A jojo fan running to ova",
            "A good friend that is ova",
            "This beautiful, tear-jerking story",
            "I’ve been getting progressively less funny"
        ],
        message: <Vase/>
    }
];

const deelon = <Deelon/>;

const tempVec1 = new THREE.Vector3();
const tempRay1 = new THREE.Ray();

export default class App extends React.Component<{}, AppState> {

    private readonly scene = new THREE.Scene();
    private readonly camera = new THREE.PerspectiveCamera(90, 1, 0.1, 128);

    private readonly grid = new Grid(20);
    private readonly renderer = new THREE.WebGLRenderer({antialias: false});
    private readonly input = new Input(document.body, {
        "mouse0": Action.fire,
        "mouse2": Action.altfire,
        "w": Action.up,
        "a": Action.left,
        "s": Action.down,
        "d": Action.right
    });
    private readonly updateList = new UpdateList(this.scene, this.camera, this.input, this.grid);

    private readonly lightAmbient = new THREE.AmbientLight(0x111111);

    private readonly effectComposer = new EffectComposer(this.renderer);
    private readonly renderPass = new RenderPass(this.scene, this.camera);
    private readonly bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.8, 1, 0.1);
    private readonly aaPass = new SMAAPass(window.innerWidth, window.innerHeight);

    private readonly groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    private readonly mouseGround = new THREE.Vector3(0, 0, 0);

    private readonly player = this.updateList.create(Player, this.mouseGround, {

    });

    private readonly cameraMovement = this.updateList.create(CameraMovement, this.camera, this.player.mesh, this.mouseGround, {
        cameraLerpSpeed: 1.0,
        mouseLerpSpeed: 2.0
    });

    private readonly quoteMap = new WeakMap<Enemy, JSX.Element>();

    private time = 0;
    private labelDiv?: HTMLDivElement;

    private arrowModel?: THREE.Mesh;
    private loadedTextures = new Map<string, THREE.Texture>();

    private ref?: HTMLDivElement;

    private nodes: THREE.Object3D[] = [];

    state = {
        message: null,
        count: 0,
        length: people.length,

        loading: 0,
        maxToLoad: 0,
        loaded: false,
        started: false
    };

    private readonly animate = () => {
        requestAnimationFrame(this.animate);

        this.input.update();

        tempRay1.origin.setFromMatrixPosition(this.camera.matrixWorld);
        tempRay1.direction
            .set(this.input.mouseNDC.x, this.input.mouseNDC.y, 0.5)
            .unproject(this.camera)
            .sub(tempRay1.origin)
            .normalize();
        tempRay1.intersectPlane(this.groundPlane, this.mouseGround);

        const time = performance.now() / 1000;
        const delta = time - this.time;
        this.time = time;

        this.updateList.update(time, delta);
        this.effectComposer.render(delta);
    };

    private readonly setSize = () => {
        this.input.setSize(window.innerWidth, window.innerHeight);
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.effectComposer.setSize(window.innerWidth, window.innerHeight);
    };

    private load() {
        let loading = 1;
        const gltfLoader = new GLTFLoader();
        const textureLoader = new THREE.TextureLoader();

        loading++;
        gltfLoader.load("/arrow.glb", ({scene}) => {
            this.arrowModel = scene.children[0] as THREE.Mesh;
            fixMaterials(this.arrowModel);
            this.onLoadComplete();
        });

        for(const {img} of people) {
            loading++;
            if(img.endsWith("mp4")) {
                const video = document.createElement("video");
                video.style.display = "none";
                video.autoplay = true;
                video.loop = true;
                video.crossOrigin = "anonymous";
                video.src = img;
                video.onloadeddata = () => {
                    this.loadedTextures.set(img, new THREE.VideoTexture(video));
                    this.onLoadComplete();
                };
                document.body.appendChild(video);
                video.load();
            }
            else {
                textureLoader.load(img, texture => {
                    this.loadedTextures.set(img, texture);
                    this.onLoadComplete();
                });
            }
        }

        textureLoader.load("/deelon_darker.png", texture => {
            this.loadedTextures.set("/deelon_darker.png", texture);
            this.onLoadComplete();
        });

        this.setState({loading: 0, maxToLoad: loading});
    }

    private onLoadComplete() {
        this.setState(({loading, maxToLoad}) => {
            loading++;
            return {loading, loaded: loading === maxToLoad};
        });
    }

    private clickToStart = () => {
        this.init(this.ref as HTMLDivElement);
        this.setState({started: true});
    };

    private init(r: HTMLDivElement) {
        window.addEventListener("resize", this.setSize, false);
        this.setSize();

        this.effectComposer.addPass(this.renderPass);
        this.effectComposer.addPass(this.bloomPass);
        this.effectComposer.addPass(this.aaPass);

        this.renderer.setClearColor(0x000000, 1.0);

        this.camera.position.set(0, 50, 0);
        this.camera.lookAt(0, 0, 0);

        const labelDiv = document.createElement("div");
        labelDiv.style.position = "relative";
        labelDiv.style.width = "100%";
        labelDiv.style.height = "100%";
        this.labelDiv = labelDiv;
        r.appendChild(labelDiv);

        const positionsUsedSoFar: THREE.Vector3[] = [];
        for(const {img, quotes, message} of people) {
            const texture = this.loadedTextures.get(img) as THREE.Texture;
            let position = new THREE.Vector3();
            let iterations = 0;
            do {
                const theta = THREE.Math.randFloat(-2 * Math.PI, 2 * Math.PI);
                const radius = THREE.Math.randFloat(125, 200);
                const phi = Math.PI / 2;
                position.setFromSphericalCoords(radius, phi, theta);
                iterations++;
            } while(positionsUsedSoFar.some(p => p.distanceToSquared(position) < 40 * 40) && iterations < 100);
            positionsUsedSoFar.push(position);
            const created = this.updateList.create(Enemy, position, texture, this.player, labelDiv, this.nodes, {
                quotes: quotes,
                health: 200,
                randomStartingAttack: true,
                onDie: this.onDie
            });
            this.quoteMap.set(created, message);
        }

        this.updateList.create(Arrow, this.player.mesh, this.arrowModel as THREE.Mesh, this.nodes);

        this.scene.add(this.camera, this.lightAmbient);

        r.appendChild(this.renderer.domElement);

        this.animate();
    }

    private readonly onDie = (enemy: Enemy) => {
        this.updateList.globals.pause = true;

        const message = this.quoteMap.get(enemy);
        if(message) {
            setTimeout(() => {
                this.setState(state => {
                    const count = state.count + 1;
                    const newState: Partial<AppState> = {
                        message, count
                    };
                    return newState as AppState;
                });
            }, 2000);
        }

    };

    private readonly onCloseClicked = () => {
        this.updateList.globals.pause = false;

        this.setState(state => {
            const {count} = state;
            const newState: Partial<AppState> = {
                message: null
            };
            if(count === people.length) {
                newState.length = state.length + 1;
                const enemy = this.updateList.create(Enemy, tempVec1.set(0, 0, 100), this.loadedTextures.get("/deelon_darker.png") as THREE.Texture, this.player, this.labelDiv as HTMLDivElement, this.nodes, {
                    quotes: ["", ""],
                    boss: true,
                    health: 600,
                    switchAttacks: true,
                    switchAttackTime: new Range(5, 10),
                    startingAttack: AttackMode.Round,
                    onDie: this.onDie
                });
                this.quoteMap.set(enemy, deelon);
            }
            return newState as AppState;
        });
    };

    private shutdown() {

    }

    private readonly setRef = (r: HTMLDivElement) => {
        if(r) {
            this.ref = r;
            this.load();
        }
        else {
            this.shutdown();
        }
    };

    render() {
        const {message, count, length, loaded, loading, maxToLoad, started} = this.state;
        return (
            <div className="app" ref={this.setRef}>
                <Overlay onCloseClicked={this.onCloseClicked}>
                    {message}
                </Overlay>
                <div className="count">{count}/{length}</div>
                <div className={"loading-overlay " + (started ? "hide-animate loading-overlay-done" : (loaded ? "loading-overlay-loaded" : ""))} onClick={!loaded ? undefined : this.clickToStart}>
                    {!loaded ?
                        `Loading: ${(loading / maxToLoad) * 100} %` :
                        <>
                            WASD to move, left click to shoot, aim with mouse.
                            <br/>
                            <br/>
                            Click to start
                        </>
                    }
                </div>
            </div>
        );
    }
}

function fixMaterials(object: THREE.Object3D) {
    object.traverse(object => {
        if(object instanceof THREE.Mesh) {
            if(Array.isArray(object.material)) {
                object.material = object.material.map((m: THREE.Material & {color? : THREE.Color}) =>
                    new THREE.MeshBasicMaterial({color: m.color ? m.color : 0x666666})
                )
            }
            else {
                const m = (object.material as THREE.Material & {color? : THREE.Color});
                object.material = new THREE.MeshBasicMaterial({
                    color: m.color ? m.color : 0x666666
                });
            }
        }
    });
}

