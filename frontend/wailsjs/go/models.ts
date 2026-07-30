export namespace history {
	
	export class ActivitySegment {
	    category: string;
	    app: string;
	    title?: string;
	    domain?: string;
	    seconds: number;
	
	    static createFrom(source: any = {}) {
	        return new ActivitySegment(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.category = source["category"];
	        this.app = source["app"];
	        this.title = source["title"];
	        this.domain = source["domain"];
	        this.seconds = source["seconds"];
	    }
	}
	export class BucketPoint {
	    hour: number;
	    seconds: number;
	
	    static createFrom(source: any = {}) {
	        return new BucketPoint(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.hour = source["hour"];
	        this.seconds = source["seconds"];
	    }
	}
	export class PhaseEvent {
	    id: string;
	    phase: string;
	    start: string;
	    end: string;
	    plannedSeconds: number;
	    actualSeconds: number;
	    pausedSeconds: number;
	    pauseCount: number;
	    outcome: string;
	    activity?: ActivitySegment[];
	    note?: string;
	
	    static createFrom(source: any = {}) {
	        return new PhaseEvent(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.phase = source["phase"];
	        this.start = source["start"];
	        this.end = source["end"];
	        this.plannedSeconds = source["plannedSeconds"];
	        this.actualSeconds = source["actualSeconds"];
	        this.pausedSeconds = source["pausedSeconds"];
	        this.pauseCount = source["pauseCount"];
	        this.outcome = source["outcome"];
	        this.activity = this.convertValues(source["activity"], ActivitySegment);
	        this.note = source["note"];
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
	export class SchedulePause {
	    startMinute: number;
	    durationMinutes: number;
	
	    static createFrom(source: any = {}) {
	        return new SchedulePause(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.startMinute = source["startMinute"];
	        this.durationMinutes = source["durationMinutes"];
	    }
	}
	export class ScheduleDay {
	    enabled: boolean;
	    startMinute: number;
	    endMinute: number;
	    targetMinutes: number;
	    breaks: SchedulePause[];
	
	    static createFrom(source: any = {}) {
	        return new ScheduleDay(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.enabled = source["enabled"];
	        this.startMinute = source["startMinute"];
	        this.endMinute = source["endMinute"];
	        this.targetMinutes = source["targetMinutes"];
	        this.breaks = this.convertValues(source["breaks"], SchedulePause);
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
	export class Schedule {
	    enabled: boolean;
	    useTargetOnly: boolean;
	    days: ScheduleDay[];
	
	    static createFrom(source: any = {}) {
	        return new Schedule(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.enabled = source["enabled"];
	        this.useTargetOnly = source["useTargetOnly"];
	        this.days = this.convertValues(source["days"], ScheduleDay);
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
	export class Report {
	    day: string;
	    hasData: boolean;
	    historyEnabled: boolean;
	    phases: PhaseEvent[];
	    tomatoesToday: number;
	    averageTomatoes7: number;
	    startedWork: number;
	    completedWork: number;
	    adherenceRate: number;
	    skippedBreaks: number;
	    pauseSeconds: number;
	    pauseCount: number;
	    longestWorkStreak: number;
	    currentWorkStreak: number;
	    productiveHour: number;
	    hourlyWork: BucketPoint[];
	    plannedWorkSeconds: number;
	    coverageRate: number;
	    workInBreakSeconds: number;
	    afterHoursSeconds: number;
	    schedule: Schedule;
	
	    static createFrom(source: any = {}) {
	        return new Report(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.day = source["day"];
	        this.hasData = source["hasData"];
	        this.historyEnabled = source["historyEnabled"];
	        this.phases = this.convertValues(source["phases"], PhaseEvent);
	        this.tomatoesToday = source["tomatoesToday"];
	        this.averageTomatoes7 = source["averageTomatoes7"];
	        this.startedWork = source["startedWork"];
	        this.completedWork = source["completedWork"];
	        this.adherenceRate = source["adherenceRate"];
	        this.skippedBreaks = source["skippedBreaks"];
	        this.pauseSeconds = source["pauseSeconds"];
	        this.pauseCount = source["pauseCount"];
	        this.longestWorkStreak = source["longestWorkStreak"];
	        this.currentWorkStreak = source["currentWorkStreak"];
	        this.productiveHour = source["productiveHour"];
	        this.hourlyWork = this.convertValues(source["hourlyWork"], BucketPoint);
	        this.plannedWorkSeconds = source["plannedWorkSeconds"];
	        this.coverageRate = source["coverageRate"];
	        this.workInBreakSeconds = source["workInBreakSeconds"];
	        this.afterHoursSeconds = source["afterHoursSeconds"];
	        this.schedule = this.convertValues(source["schedule"], Schedule);
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

export namespace timer {
	
	export class FixedPause {
	    start: string;
	    durationMinutes: number;
	
	    static createFrom(source: any = {}) {
	        return new FixedPause(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.start = source["start"];
	        this.durationMinutes = source["durationMinutes"];
	    }
	}
	export class Harvest {
	    tomatoes: number;
	    total: number;
	    day: string;
	    streak: number;
	    bestStreak: number;
	
	    static createFrom(source: any = {}) {
	        return new Harvest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.tomatoes = source["tomatoes"];
	        this.total = source["total"];
	        this.day = source["day"];
	        this.streak = source["streak"];
	        this.bestStreak = source["bestStreak"];
	    }
	}
	export class Workday {
	    enabled: boolean;
	    start: string;
	    end: string;
	    targetMinutes: number;
	    breaks: FixedPause[];
	
	    static createFrom(source: any = {}) {
	        return new Workday(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.enabled = source["enabled"];
	        this.start = source["start"];
	        this.end = source["end"];
	        this.targetMinutes = source["targetMinutes"];
	        this.breaks = this.convertValues(source["breaks"], FixedPause);
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
	export class WorkHours {
	    useTargetOnly: boolean;
	    days: Workday[];
	
	    static createFrom(source: any = {}) {
	        return new WorkHours(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.useTargetOnly = source["useTargetOnly"];
	        this.days = this.convertValues(source["days"], Workday);
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
	    historyEnabled: boolean;
	    historyRetentionDays: number;
	    historyPrompted: boolean;
	    workHoursEnabled: boolean;
	    workHours: WorkHours;
	
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
	        this.historyEnabled = source["historyEnabled"];
	        this.historyRetentionDays = source["historyRetentionDays"];
	        this.historyPrompted = source["historyPrompted"];
	        this.workHoursEnabled = source["workHoursEnabled"];
	        this.workHours = this.convertValues(source["workHours"], WorkHours);
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

