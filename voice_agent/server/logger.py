#!/usr/bin/env python3
"""
Structured Logger for Voice Agent Server
Replaces print() with structured log messages.
Format: [TIMESTAMP] [LEVEL] [COMPONENT] message
"""
from __future__ import annotations

import sys
from datetime import datetime
from enum import IntEnum


class Level(IntEnum):
    DEBUG = 0
    INFO = 1
    WARN = 2
    ERROR = 3


_LEVEL_NAMES = {
    Level.DEBUG: "DEBUG",
    Level.INFO: " INFO",
    Level.WARN: " WARN",
    Level.ERROR: "ERROR",
}

# Minimum level to emit — configurable at module level
min_level: Level = Level.DEBUG


def _format(level: Level, component: str, message: str) -> str:
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
    return f"[{ts}] [{_LEVEL_NAMES[level]}] [{component}] {message}"


def _emit(level: Level, component: str, message: str) -> None:
    if level < min_level:
        return
    line = _format(level, component, message)
    dest = sys.stderr if level >= Level.ERROR else sys.stdout
    print(line, file=dest, flush=True)


def debug(component: str, message: str) -> None:
    _emit(Level.DEBUG, component, message)


def info(component: str, message: str) -> None:
    _emit(Level.INFO, component, message)


def warn(component: str, message: str) -> None:
    _emit(Level.WARN, component, message)


def error(component: str, message: str) -> None:
    _emit(Level.ERROR, component, message)
