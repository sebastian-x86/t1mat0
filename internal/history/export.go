package history

import (
	"bytes"
	"encoding/csv"
	"strconv"
)

// CSV exports raw phase events as UTF-8 (with BOM for Excel).
func CSV(log Log) ([]byte, error) {
	log = normalize(log)

	buf := bytes.NewBuffer([]byte{0xEF, 0xBB, 0xBF})
	writer := csv.NewWriter(buf)
	header := []string{
		"id",
		"phase",
		"start",
		"end",
		"plannedSeconds",
		"actualSeconds",
		"pausedSeconds",
		"pauseCount",
		"outcome",
		"note",
	}
	if err := writer.Write(header); err != nil {
		return nil, err
	}
	for _, phase := range log.Phases {
		row := []string{
			phase.ID,
			phase.Phase,
			phase.Start,
			phase.End,
			strconv.Itoa(phase.PlannedSeconds),
			strconv.Itoa(phase.ActualSeconds),
			strconv.Itoa(phase.PausedSeconds),
			strconv.Itoa(phase.PauseCount),
			string(phase.Outcome),
			phase.Note,
		}
		if err := writer.Write(row); err != nil {
			return nil, err
		}
	}
	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
