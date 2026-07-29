//go:build !windows

package main

import "os"

// detectSystemLanguage reads the usual POSIX locale environment variables.
func detectSystemLanguage() string {
	for _, key := range []string{"LC_ALL", "LC_MESSAGES", "LANG", "LANGUAGE"} {
		if value := os.Getenv(key); value != "" {
			return value
		}
	}
	return ""
}
