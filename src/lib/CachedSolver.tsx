import { FbdrSolver, SolverT, SsSolver, FbSolver } from './Solver';

let CachedSolver = function() {
    let cache : Map<string, SolverT> = new Map()
    function get(s: string) {
        if (!cache.has(s)) {
            switch (s) {
                case "fbdr": cache.set(s, FbdrSolver()); break
                case "fb": cache.set(s, FbSolver()); break
                case "ss-front": cache.set(s, SsSolver(true)); break
                case "ss-back": cache.set(s, SsSolver(false)); break
            }
        }
        return cache.get(s) as SolverT
    }
    return {get}
}()

export {CachedSolver}