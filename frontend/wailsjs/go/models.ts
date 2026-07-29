export namespace main {
	
	export class Settings {
	    workSeconds: number;
	    shortBreakSeconds: number;
	    longBreakSeconds: number;
	    longBreakEvery: number;
	    alwaysOnTop: boolean;
	    soundEnabled: boolean;
	    autoStartNext: boolean;
	
	    static createFrom(source: any = {}) {
	        return new Settings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.workSeconds = source["workSeconds"];
	        this.shortBreakSeconds = source["shortBreakSeconds"];
	        this.longBreakSeconds = source["longBreakSeconds"];
	        this.longBreakEvery = source["longBreakEvery"];
	        this.alwaysOnTop = source["alwaysOnTop"];
	        this.soundEnabled = source["soundEnabled"];
	        this.autoStartNext = source["autoStartNext"];
	    }
	}
	export class State {
	    status: string;
	    phase: string;
	    phaseLabel: string;
	    completedWork: number;
	    remainingSeconds: number;
	    totalSeconds: number;
	    formattedRemaining: string;
	    settings: Settings;
	
	    static createFrom(source: any = {}) {
	        return new State(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.status = source["status"];
	        this.phase = source["phase"];
	        this.phaseLabel = source["phaseLabel"];
	        this.completedWork = source["completedWork"];
	        this.remainingSeconds = source["remainingSeconds"];
	        this.totalSeconds = source["totalSeconds"];
	        this.formattedRemaining = source["formattedRemaining"];
	        this.settings = this.convertValues(source["settings"], Settings);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

