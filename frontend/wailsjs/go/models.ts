export namespace timer {
	
	export class Harvest {
	    tomatoes: number;
	    streak: number;
	    bestStreak: number;
	
	    static createFrom(source: any = {}) {
	        return new Harvest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.tomatoes = source["tomatoes"];
	        this.streak = source["streak"];
	        this.bestStreak = source["bestStreak"];
	    }
	}
	export class Settings {
	    workSeconds: number;
	    shortBreakSeconds: number;
	    longBreakSeconds: number;
	    longBreakEvery: number;
	    alwaysOnTop: boolean;
	    soundEnabled: boolean;
	    autoStartNext: boolean;
	    language: string;
	    theme: string;
	    notificationsEnabled: boolean;
	    closeToTray: boolean;
	    singleKeyShortcuts: boolean;
	
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
	        this.language = source["language"];
	        this.theme = source["theme"];
	        this.notificationsEnabled = source["notificationsEnabled"];
	        this.closeToTray = source["closeToTray"];
	        this.singleKeyShortcuts = source["singleKeyShortcuts"];
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
	    harvest: Harvest;
	    language: string;
	
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
	        this.harvest = this.convertValues(source["harvest"], Harvest);
	        this.language = source["language"];
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

