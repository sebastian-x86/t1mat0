import {useEffect, useRef, useState} from "react";
import {ExportHistory, UpdateSettings} from "../../wailsjs/go/main/App";
import {timer} from "../../wailsjs/go/models";
import {toDuration} from "../duration";
import type {Strings} from "../i18n";
import {formatBreaks, parseBreaks} from "../workhours";
import "./ReportView.css";

type PhaseEvent = {
    id: string;
    phase: string;
    start: string;
    end: string;
    actualSeconds: number;
    outcome: string;
};

type BucketPoint = {hour: number; seconds: number};

export type ReportData = {
    hasData: boolean;
    phases: PhaseEvent[];
    tomatoesToday: number;
    averageTomatoes7: number;
    adherenceRate: number;
    skippedBreaks: number;
    pauseSeconds: number;
    pauseCount: number;
    longestWorkStreak: number;
    currentWorkStreak: number;
    productiveHour: number;
    hourlyWork: BucketPoint[];
    coverageRate: number;
    workInBreakSeconds: number;
    afterHoursSeconds: number;
};

type Props = {
    t: Strings;
    report: ReportData | null;
    settings: timer.Settings;
    onApplied: (state: timer.State) => void;
    onRefresh: () => void;
    onClose: () => void;
};

const phaseClass: Record<string, string> = {
    work: "report__segment--work",
    shortBreak: "report__segment--short",
    longBreak: "report__segment--long",
};

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function ReportView({t, report, settings, onApplied, onRefresh, onClose}: Props) {
    const [tab, setTab] = useState<"overview" | "workHours">("overview");
    const [openPhases, setOpenPhases] = useState(false);
    const [workHoursEnabled, setWorkHoursEnabled] = useState(settings.workHoursEnabled);
    const [workHours, setWorkHours] = useState<timer.WorkHours>(() =>
        timer.WorkHours.createFrom({...settings.workHours, useTargetOnly: false}),
    );
    const [workHoursError, setWorkHoursError] = useState("");

    const phaseLabel = (phase: string) => {
        if (phase === "work") {
            return t.work;
        }
        if (phase === "shortBreak") {
            return t.shortBreak;
        }
        if (phase === "longBreak") {
            return t.longBreak;
        }
        return phase;
    };

    const saveWorkHours = async (
        nextEnabled: boolean,
        nextHours: timer.WorkHours,
    ): Promise<void> => {
        try {
            for (const day of nextHours.days ?? []) {
                for (const pause of day.breaks ?? []) {
                    const validStart = /^\d{2}:\d{2}$/.test(pause.start);
                    if (!validStart || pause.durationMinutes <= 0) {
                        throw new Error(t.workHoursInvalidBreaks);
                    }
                }
            }
            const next = timer.Settings.createFrom({
                ...settings,
                workHoursEnabled: nextEnabled,
                workHours: timer.WorkHours.createFrom({...nextHours, useTargetOnly: false}),
            });
            setWorkHoursError("");
            onApplied(timer.State.createFrom(await UpdateSettings(next)));
            onRefresh();
        } catch (error) {
            setWorkHoursError(String(error));
        }
    };

    // Work hours save themselves. Debouncing keeps typing in the time and break
    // fields from writing settings.json on every keystroke.
    const saveRef = useRef(saveWorkHours);
    const dirty = useRef(false);

    useEffect(() => {
        saveRef.current = saveWorkHours;
    });

    useEffect(() => {
        if (!dirty.current) {
            return;
        }
        const handle = window.setTimeout(() => {
            void saveRef.current(workHoursEnabled, workHours);
        }, 500);
        return () => window.clearTimeout(handle);
    }, [workHoursEnabled, workHours]);

    const changeWorkHoursEnabled = (enabled: boolean) => {
        dirty.current = true;
        setWorkHoursEnabled(enabled);
    };

    const changeWorkHours = (next: timer.WorkHours) => {
        dirty.current = true;
        setWorkHours(next);
    };

    return (
        <section className="report">
            <header className="report__header">
                <h2>{t.reportTitle}</h2>
                <button className="btn btn--icon" onClick={onClose} title={t.reportBack}>
                    ×
                </button>
            </header>

            <div className="report__tabs">
                <button
                    className={`report__tab${tab === "overview" ? " report__tab--active" : ""}`}
                    onClick={() => setTab("overview")}
                >
                    {t.reportTabOverview}
                </button>
                <button
                    className={`report__tab${tab === "workHours" ? " report__tab--active" : ""}`}
                    onClick={() => setTab("workHours")}
                >
                    {t.reportTabWorkHours}
                </button>
            </div>

            {tab === "workHours" ? (
                <WorkHoursEditor
                    t={t}
                    workHoursEnabled={workHoursEnabled}
                    onEnabledChange={changeWorkHoursEnabled}
                    workHours={workHours}
                    onWorkHoursChange={changeWorkHours}
                    error={workHoursError}
                />
            ) : (
                <Overview
                    t={t}
                    report={report}
                    phaseLabel={phaseLabel}
                    openPhases={openPhases}
                    onOpenPhasesChange={setOpenPhases}
                />
            )}
        </section>
    );
}

function Overview({
    t,
    report,
    phaseLabel,
    openPhases,
    onOpenPhasesChange,
}: {
    t: Strings;
    report: ReportData | null;
    phaseLabel: (phase: string) => string;
    openPhases: boolean;
    onOpenPhasesChange: (open: boolean) => void;
}) {
    if (!report) {
        return <p className="report__empty">{t.loading}</p>;
    }
    if (!report.hasData) {
        return <p className="report__empty">{t.reportNoData}</p>;
    }

    const adherencePercent = Math.round((report.adherenceRate ?? 0) * 100);
    const coveragePercent = Math.round((report.coverageRate ?? 0) * 100);
    const maxHourSeconds = Math.max(...report.hourlyWork.map((h) => h.seconds), 1);
    const [first, last] = report.phases.length
        ? [report.phases[0], report.phases[report.phases.length - 1]]
        : [null, null];

    return (
        <>
            <div className="report__stats report__stats--hero">
                <Stat label={t.reportTomatoesToday} value={String(report.tomatoesToday)} />
                <Stat label={t.reportAvg7} value={String(report.averageTomatoes7)} />
                <Stat label={t.reportAdherence} value={`${adherencePercent}%`} />
                <Stat label={t.reportCoverage} value={`${coveragePercent}%`} />
                <Stat label={t.reportSkippedBreaks} value={String(report.skippedBreaks)} />
                <Stat
                    label={t.reportPaused}
                    value={`${report.pauseCount} · ${toDuration(report.pauseSeconds)}`}
                />
                <Stat
                    label={t.reportStreak}
                    value={`${report.currentWorkStreak}/${report.longestWorkStreak}`}
                />
                <Stat
                    label={t.reportProductiveHour}
                    value={`${String(report.productiveHour).padStart(2, "0")}:00`}
                />
                <Stat label={t.reportAfterHours} value={toDuration(report.afterHoursSeconds)} />
                <Stat label={t.reportWorkInBreaks} value={toDuration(report.workInBreakSeconds)} />
            </div>

            <h3 className="report__heading">{t.reportTimeline}</h3>
            <div className="report__timeline" aria-label={t.reportTimeline}>
                {report.phases.map((phase) => {
                    const seconds = Math.max(phase.actualSeconds, 1);
                    const stateClass =
                        phase.outcome === "skipped" || phase.outcome === "abandoned"
                            ? " report__segment--problem"
                            : "";
                    return (
                        <div
                            key={phase.id}
                            className={`report__segment ${phaseClass[phase.phase] ?? ""}${stateClass}`}
                            style={{flexGrow: seconds}}
                            title={`${phaseLabel(phase.phase)} · ${toDuration(phase.actualSeconds)} · ${phase.outcome}`}
                        />
                    );
                })}
            </div>
            <div className="report__timeline-labels">
                <span>
                    {first
                        ? new Date(first.start).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                          })
                        : "00:00"}
                </span>
                <span>{t.reportTimelineLegend}</span>
                <span>
                    {last
                        ? new Date(last.end).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                          })
                        : "23:59"}
                </span>
            </div>

            <h3 className="report__heading">{t.reportProductiveHour}</h3>
            <div className="report__hours" aria-label={t.reportProductiveHour}>
                {report.hourlyWork.map((point) => (
                    <div key={point.hour} className="report__hour">
                        <div
                            className={`report__hour-bar${point.seconds === 0 ? " report__hour-bar--empty" : ""}`}
                            style={{
                                height:
                                    point.seconds === 0
                                        ? "0%"
                                        : `${Math.max(
                                              6,
                                              Math.round((point.seconds / maxHourSeconds) * 100),
                                          )}%`,
                            }}
                        />
                        <span>{String(point.hour).padStart(2, "0")}</span>
                    </div>
                ))}
            </div>

            <section className="report__phases">
                <div className="report__phases-head">
                    <button
                        className="report__collapse"
                        onClick={() => onOpenPhasesChange(!openPhases)}
                    >
                        <span>{openPhases ? "▾" : "▸"}</span>
                        {t.reportTable}
                    </button>
                    <div className="report__exports">
                        <button
                            className="report__icon-btn"
                            title={t.exportCsvTitle}
                            onClick={() => ExportHistory("csv")}
                        >
                            <span aria-hidden="true">⤓</span>
                            CSV
                        </button>
                        <button
                            className="report__icon-btn"
                            title={t.exportJsonTitle}
                            onClick={() => ExportHistory("json")}
                        >
                            <span aria-hidden="true">{"{ }"}</span>
                            JSON
                        </button>
                    </div>
                </div>

                {openPhases && (
                    <table className="report__table">
                        <thead>
                            <tr>
                                <th>{t.reportStartedAt}</th>
                                <th>{t.reportEndedAt}</th>
                                <th>{t.reportPhase}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {report.phases.map((phase) => {
                                const start = new Date(phase.start).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                });
                                const end = new Date(phase.end).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                });
                                const problem =
                                    phase.outcome === "skipped" || phase.outcome === "abandoned";
                                return (
                                    <tr
                                        key={phase.id}
                                        className={problem ? "report__row--problem" : ""}
                                    >
                                        <td>{start}</td>
                                        <td>{end}</td>
                                        <td
                                            title={t.reportDurationHint(
                                                toDuration(phase.actualSeconds),
                                            )}
                                        >
                                            {phaseLabel(phase.phase)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </section>
        </>
    );
}

function WorkHoursEditor({
    t,
    workHoursEnabled,
    onEnabledChange,
    workHours,
    onWorkHoursChange,
    error,
}: {
    t: Strings;
    workHoursEnabled: boolean;
    onEnabledChange: (enabled: boolean) => void;
    workHours: timer.WorkHours;
    onWorkHoursChange: (next: timer.WorkHours) => void;
    error: string;
}) {
    const [breakDrafts, setBreakDrafts] = useState<Record<number, string>>({});
    const [breakInvalid, setBreakInvalid] = useState<Record<number, boolean>>({});
    const days = [...(workHours.days ?? [])];
    while (days.length < 7) {
        days.push(
            timer.Workday.createFrom({
                enabled: false,
                start: "09:00",
                end: "17:00",
                targetMinutes: 480,
                breaks: [],
            }),
        );
    }

    const updateDay = (index: number, next: timer.Workday) => {
        const nextDays = [...days];
        nextDays[index] = next;
        onWorkHoursChange(timer.WorkHours.createFrom({...workHours, days: nextDays}));
    };

    const setDayBreaksFromInput = (index: number, day: timer.Workday, raw: string) => {
        setBreakDrafts((state) => ({...state, [index]: raw}));
        const parsed = parseBreaks(raw);
        if (parsed === null) {
            setBreakInvalid((state) => ({...state, [index]: raw.trim().length > 0}));
            return;
        }
        setBreakInvalid((state) => ({...state, [index]: false}));
        updateDay(index, timer.Workday.createFrom({...day, breaks: parsed}));
    };

    const normalizeBreakDraft = (index: number, day: timer.Workday, raw: string) => {
        const parsed = parseBreaks(raw);
        if (parsed === null) {
            setBreakInvalid((state) => ({...state, [index]: raw.trim().length > 0}));
            return;
        }
        setBreakInvalid((state) => ({...state, [index]: false}));
        updateDay(index, timer.Workday.createFrom({...day, breaks: parsed}));
        setBreakDrafts((state) => ({...state, [index]: formatBreaks(parsed)}));
    };

    const activeDays = WEEKDAY_ORDER.filter((index) => days[index]?.enabled);
    const inactiveDays = WEEKDAY_ORDER.filter((index) => !days[index]?.enabled);

    const addDay = () => {
        const index = inactiveDays[0];
        if (index === undefined) {
            return;
        }
        const previous = activeDays.length ? days[activeDays[activeDays.length - 1]] : undefined;
        const template = previous
            ? {
                  start: previous.start,
                  end: previous.end,
                  targetMinutes: previous.targetMinutes,
                  breaks: (previous.breaks ?? []).map((item) =>
                      timer.FixedPause.createFrom({...item}),
                  ),
              }
            : {
                  start: "08:00",
                  end: "16:30",
                  targetMinutes: 480,
                  breaks: [
                      timer.FixedPause.createFrom({
                          start: "12:00",
                          durationMinutes: 30,
                      }),
                  ],
              };
        setBreakDrafts((state) => {
            const next = {...state};
            delete next[index];
            return next;
        });
        setBreakInvalid((state) => ({...state, [index]: false}));
        updateDay(index, timer.Workday.createFrom({...template, enabled: true}));
    };

    return (
        <div className="report__workhours">
            <label className="toggle" title={t.workHoursEnabledTitle}>
                <input
                    type="checkbox"
                    checked={workHoursEnabled}
                    onChange={(event) => onEnabledChange(event.target.checked)}
                />
                {t.workHoursEnabled}
            </label>
            <p className="settings__hint">{t.workHoursEnabledHelp}</p>

            <table
                className="report__table report__table--workhours"
                hidden={activeDays.length === 0}
            >
                <caption className="sr-only">{t.workHoursTableCaption}</caption>
                <colgroup>
                    <col className="report__col-remove" />
                    <col className="report__col-day" />
                    <col className="report__col-time" />
                    <col />
                </colgroup>
                <thead>
                    <tr>
                        <th scope="col" className="report__remove-col">
                            <span className="sr-only">{t.reportActions}</span>
                        </th>
                        <th scope="col" className="report__weekday-col">
                            {t.workHoursWeekday}
                        </th>
                        <th scope="col">{t.workHoursTimeRange}</th>
                        <th scope="col">{t.workHoursBreaks}</th>
                    </tr>
                </thead>
                <tbody>
                    {activeDays.map((index) => {
                        const day = days[index];
                        const weekday = weekdayLabel(index, t);
                        return (
                            <tr key={index}>
                                <td className="report__remove-col">
                                    <button
                                        type="button"
                                        className="report__delete-btn"
                                        title={t.workHoursRemoveDay}
                                        aria-label={t.workHoursRemoveDayFor(weekday)}
                                        onClick={() => {
                                            setBreakDrafts((state) => {
                                                const next = {...state};
                                                delete next[index];
                                                return next;
                                            });
                                            setBreakInvalid((state) => ({
                                                ...state,
                                                [index]: false,
                                            }));
                                            updateDay(
                                                index,
                                                timer.Workday.createFrom({
                                                    ...day,
                                                    enabled: false,
                                                    breaks: [],
                                                }),
                                            );
                                        }}
                                    >
                                        ×
                                    </button>
                                </td>
                                <th scope="row" className="report__weekday-col">
                                    {weekday}
                                </th>
                                <td>
                                    <div className="report__time-range">
                                        <input
                                            className="report__time-input"
                                            type="time"
                                            value={day.start}
                                            aria-label={t.workHoursStartFor(weekday)}
                                            onChange={(event) =>
                                                updateDay(
                                                    index,
                                                    timer.Workday.createFrom({
                                                        ...day,
                                                        start: event.target.value,
                                                    }),
                                                )
                                            }
                                        />
                                        <span aria-hidden="true">-</span>
                                        <input
                                            className="report__time-input"
                                            type="time"
                                            value={day.end}
                                            aria-label={t.workHoursEndFor(weekday)}
                                            onChange={(event) =>
                                                updateDay(
                                                    index,
                                                    timer.Workday.createFrom({
                                                        ...day,
                                                        end: event.target.value,
                                                    }),
                                                )
                                            }
                                        />
                                    </div>
                                </td>
                                <td>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={breakDrafts[index] ?? formatBreaks(day.breaks ?? [])}
                                        placeholder="12-12:30; 15-15:30"
                                        aria-label={t.workHoursBreaksFor(weekday)}
                                        title={t.workHoursBreaksHint}
                                        aria-invalid={breakInvalid[index] ? true : undefined}
                                        aria-errormessage={
                                            breakInvalid[index]
                                                ? `workhours-break-error-${index}`
                                                : undefined
                                        }
                                        onChange={(event) =>
                                            setDayBreaksFromInput(index, day, event.target.value)
                                        }
                                        onBlur={(event) =>
                                            normalizeBreakDraft(index, day, event.target.value)
                                        }
                                        className={
                                            breakInvalid[index]
                                                ? "report__breaks-input report__breaks-input--invalid"
                                                : "report__breaks-input"
                                        }
                                    />
                                    {breakInvalid[index] && (
                                        <span
                                            id={`workhours-break-error-${index}`}
                                            className="sr-only"
                                        >
                                            {t.workHoursInvalidBreaks}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            <button
                type="button"
                className="btn"
                disabled={inactiveDays.length === 0}
                onClick={addDay}
            >
                {t.workHoursAddDay}
            </button>

            {error && (
                <p className="settings__error" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}

function weekdayLabel(index: number, t: Strings): string {
    switch (index) {
        case 1:
            return t.weekdayMon;
        case 2:
            return t.weekdayTue;
        case 3:
            return t.weekdayWed;
        case 4:
            return t.weekdayThu;
        case 5:
            return t.weekdayFri;
        case 6:
            return t.weekdaySat;
        default:
            return t.weekdaySun;
    }
}

function Stat({label, value}: {label: string; value: string}) {
    return (
        <div className="report__stat">
            <span>{label}</span>
            <strong>{value}</strong>
        </div>
    );
}
