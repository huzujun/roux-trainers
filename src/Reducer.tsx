
import { AppState, StateT, Action, Mode } from "./Types"
import { alg_generator, AlgDesc } from "./lib/Algs"
import { MoveT, CubieT } from "./lib/Defs";
import { CubieCube, Move, CubeUtil } from './lib/CubeLib';
import { setConfig, getConfig, getActiveNames} from './components/Config';
import { CachedSolver } from "./lib/CachedSolver";
import { rand_choice } from './lib/Math';

export const getInitialState = (mode?: Mode) : AppState => {
    mode = mode || "fbdr"
    let initialStateName : StateT = function() {
        switch (mode){
            case "cmll": return "solved"
            case "fbdr": return "revealed"
        }
    }()
    return {
        name: initialStateName,
        mode,
        cube: {
            state: CubieCube.id,
            ori: "WG",
            history: [],
        },
        case: {
            state: CubieCube.id,
            desc: []
        },
        config: getConfig()
    }
}

export function reducer(state: AppState, action: Action): AppState {
    // todo: cache values based on this
    // console.log("prev state", state)
    if (action.type === "key") {
        let newState = reduceKey(state, action.content)
        return newState
    } else if (action.type === "config") {
        setConfig(action.content)
        return {
            ...state,
            config: getConfig()
        }
    } else if (action.type === "mode") {
        let mode = action.content
        state = getInitialState(mode)
        return state
    } else{
        return state
    }
}

// State Manager
// Handles actions based on state.
// "Passively" updates localstorage in reduce.
abstract class StateM {
    state: AppState;
    constructor(state: AppState) {
        this.state = state
    }
    abstract move(s: string): AppState;

    static create(state: AppState) {
        let mode : Mode = state.mode
        if (mode === "fbdr") {
            return new FbdrStateM(state)
        }
        else if (mode === "cmll") {
            if (state.name === "solving") {
                return new SolvingStateM(state)
            } else if (state.name === "solved"){
                return new SolvedStateM(state)
            } else
                throw new Error("Impossible");
        }
        else
            throw new Error("Impossibe")
    }
}


abstract class CmllStateM extends StateM {
    control(s: string): AppState {
        let state = this.state
        let { config } = state
        let { cmllSelector, triggerSelector, cmllAufSelector, orientationSelector } = config
        let generator = alg_generator(cmllSelector)
        let trig_generator = alg_generator(triggerSelector)
        let u_auf_generator = alg_generator(cmllAufSelector)
        let ori_generator = alg_generator(orientationSelector)

        if (s === "#enter") {
            // SCRAMBLE
            // enter cleared solving state based on selection
            let trigger_alg: AlgDesc = trig_generator()
            let alg: AlgDesc = generator();
            let u_auf_alg: AlgDesc = u_auf_generator()
            let alg_str = trigger_alg.alg + " " + u_auf_alg.alg + " " + alg.alg
            let moves: MoveT[] = Move.inv(Move.parse(alg_str));

            //console.log("moves", Move.to_string(moves))
            let cube = CubeUtil.get_random_lse()
            cube = CubieCube.apply(cube, moves)

            // ori based on ...?
            let ori: string = ori_generator().id
            //console.log("current ori selector's ori ", ori)

            return ({...state,
                name: "solving",
                cube: {
                    state: cube,
                    ori,
                    history: [],
                },
                case: {
                    state: cube,
                    desc: [trigger_alg, alg]
                },
            })
        } else if (s === "#space") {
            // REDO
            return ({...state,
                name: "solving",
                cube: {
                    ...state.cube,
                    state: state.case.state,
                    history: []
                },
                case: {
                    ...state.case,
                }
            })
        } else {
            throw new Error("Unrecognized control code")
        }
    }
}


abstract class BlockTrainerStateM extends StateM {
    abstract solverName: string;
    abstract solverL : number;
    abstract solverR : number;
    abstract solutionCap : number
    abstract getRandom : () => CubieT;

    updateScramble() : AppState {
        const state = this.state
        const cube = this.getRandom()
        const solver = CachedSolver.get(this.solverName)
        const scramble = solver.solve(cube, this.solverL, this.solverR, 1)[0]

        const magnification = 2

        const setup = Move.to_string(Move.inv(scramble))
        let solution = solver.solve(cube, 0, this.solverR, this.solutionCap * magnification)
        solution.sort( (a, b) => Move.evaluate(a) - Move.evaluate(b) )

        const alg = Move.to_string(solution[0])
        const alt_algs = solution.slice(1, this.solutionCap ).map((s: MoveT[]) => Move.to_string(s))

        let algdesc: AlgDesc = {
            id: `${this.solverName}`,
            alg,
            alt_algs,
            setup,
            kind: "fbdr"
        }
        // console.log("algdesc", algdesc)
        return {
            ...state,
            name: "hiding",
            cube: {
                ...state.cube,
                state: cube,
            },
            case: {
                ...state.case,
                desc: [algdesc]
            }
        }
    }
    control(s: string): AppState {
        let state = this.state
        if (s === "#space") {
            if (state.name === "revealed") {
                return this.updateScramble()
            } else {
                return {...state,
                    name: "revealed"
                }
            }
        }
        else {
            return state
        }
    }
    move(movestr: string): AppState {
        let state = this.state
        let move = Move.parse(movestr)[0]
        let cube = CubieCube.apply(state.cube.state, move)
        return {
            ...state,
            cube: {
                ...state.cube,
                state: cube
            }
        }
    }
}

class FbdrStateM extends BlockTrainerStateM {
    solverName : string;
    solverL : number;
    solverR : number;
    solutionCap : number
    getRandom : () => CubieT;
    constructor(state: AppState) {
        super(state)
        this.solverName = "fbdr"
        this.getRandom = () => {
            let active = getActiveNames(this.state.config.fbdrSelector)[0]
            console.log("active", active)
            //["FP at front", "FP at back", "Both"],
            if (active === "FS at back") {
                return CubeUtil.get_random_fs_back()
            } else if (active === "FS at front") {
                return CubeUtil.get_random_fs_front()
            } else return rand_choice([CubeUtil.get_random_fs_back, CubeUtil.get_random_fs_front])()
        }
        this.solverL = 8
        this.solverR = 10
        this.solutionCap = 5
    }
}


class SolvingStateM extends CmllStateM {
    move(move: string): AppState {
        let state = this.state
        let moves = Move.parse(move)
        if (moves.length > 0) {
            let move = moves[0]
            let cube = CubieCube.apply(state.cube.state, move)
            let cmll_solved = CubeUtil.is_cmll_solved(cube)
            let newState: StateT = cmll_solved ? "solved" : "solving";
            return({...state,
                cube: {
                    ...state.cube,
                    state: CubieCube.apply(state.cube.state, move),
                    history: [...state.cube.history, move],
                },
                name: newState
            })
        } else {
            // Nothing to apply
            return state
        }
    }
}

class SolvedStateM extends CmllStateM {
    move(move: string): AppState {
        return this.state
    }
}

function reduceKey(state: AppState, code: string): AppState {
    if (code === "") return state;

    const stateM = StateM.create(state)
    // case match on kind of operation
    if (code[0] === "#") {
        return stateM.control(code)
    } else {
        return stateM.move(code)
    }
}