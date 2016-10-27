'use strict';

/**
 * Сделано задание на звездочку
 * Реализовано оба метода и tryLater
 */
exports.isStar = false;

var days = {
    ПН: 1,
    ВТ: 2,
    СР: 3,
    ЧТ: 4,
    ПТ: 5,
    СБ: 6,
    ВС: 7
};

var END_OF_THE_WEEK = 7 * 24 * 60 + 24 * 60 + 60;

var bankTimeZone = 0;

var freeIntervals = [];


function getTimeStamp(day, hh, mm) {
    return day * 24 * 60 + hh * 60 + mm;
}

function parseDate(date) {
    var day = days[date.substr(0, 2)];
    var hh = parseInt(date.substr(3, 2));
    var mm = parseInt(date.substr(6, 2));
    var timeZone = parseInt(date.substring(8));
    if (hh - timeZone < 0) {
        day--;
        hh += 24 - timeZone;
    } else {
        hh -= timeZone;
    }

    return {
        dd: day,
        hh: hh,
        mm: mm
    };
}

function isBetween(item, start, end) {
    return item > start && item < end;
}

function splitSegmentUp(i, endFirst, startSecond) {
    var endSecond = freeIntervals[i].end;
    freeIntervals[i].end = endFirst;
    freeIntervals.splice(i + 1, 0, {
        start: startSecond,
        end: endSecond
    });
}

function reduceFreeIntervals(startBusy, endBusy) {
    for (var i = 0; i < freeIntervals.length; i++) {
        var startFree = freeIntervals[i].start;
        var endFree = freeIntervals[i].end;
        var updStartFree = isBetween(endBusy, startFree, endFree) ? endBusy : startFree;
        var updEndFree = isBetween(startBusy, startFree, endFree) ? startBusy : endFree;
        if (startBusy <= startFree && endFree <= endBusy) {
            freeIntervals.splice(i, 1);
            i--;
            continue;
        }
        if (updEndFree < updStartFree) {
            splitSegmentUp(i, updEndFree, updStartFree);
            i++;
            continue;
        }
        freeIntervals[i].start = updStartFree;
        freeIntervals[i].end = updEndFree;
    }
}


function getBusyIntervalsForWeek(startFree, endFree) {
    var busyIntervals = [];
    busyIntervals.push({
        start: 0,
        end: getTimeStamp(1, startFree.hh, startFree.mm)
    });
    for (var i = 1; i < 7; i++) {
        busyIntervals.push({
            start: getTimeStamp(i, endFree.hh, endFree.mm),
            end: getTimeStamp(i + 1, startFree.hh, startFree.mm)
        });
    }
    busyIntervals.push({
        start: getTimeStamp(7, endFree.hh, endFree.mm),
        end: END_OF_THE_WEEK
    });

    return busyIntervals;
}

function addTime(dd, hh, mm, delta) {
    if (hh + delta >= 24) {
        dd++;
        hh += delta - 24;
    } else {
        hh += delta;
    }

    return {
        dd: dd,
        hh: hh,
        mm: mm
    };
}

function parseTime(strTime) {
    var hh = parseInt(strTime.substr(0, 2));
    var mm = parseInt(strTime.substr(3, 2));
    var timeZone = parseInt(strTime.substring(5));
    var dd = 1;
    if (hh - timeZone < 0) {
        dd--;
        hh += 24 - timeZone;
    } else {
        hh -= timeZone;
    }

    return {
        dd: dd,
        hh: hh,
        mm: mm,
        timeZone: timeZone
    };
}

function dateToTimeStamp(date) {
    var hh = date.hh;
    var dd = date.dd;
    var mm = date.mm;

    return getTimeStamp(dd, hh, mm);
}

function filterDuration(duration) {
    freeIntervals = freeIntervals.filter(function (interval) {
        return interval.end - interval.start >= duration;
    });
}

function reduceFreeByIntervals(intervals) {
    for (var i = 0; i < intervals.length; i++) {
        var start = intervals[i].start;
        var end = intervals[i].end;
        reduceFreeIntervals(start, end);
    }
}

function reduceToGather(strIntervals) {
    var busyIntervals = strIntervals.map(function (strInterval) {
        return {
            start: dateToTimeStamp(parseDate(strInterval.from)),
            end: dateToTimeStamp(parseDate(strInterval.to))
        };
    });
    reduceFreeByIntervals(busyIntervals);
}

function correlateWithBank(bankInterval) {
    bankTimeZone = parseTime(bankInterval.from).timeZone;
    var thursdayTimeStamp = getTimeStamp(4, bankTimeZone, 0);
    reduceFreeIntervals(thursdayTimeStamp, END_OF_THE_WEEK);
    var bankClosedIntervals = getBusyIntervalsForWeek(
        parseTime(bankInterval.from), parseTime(bankInterval.to));
    reduceFreeByIntervals(bankClosedIntervals);
}

function convertToTargetTimeZoneDate(timeStamp) {
    var day = Math.floor(Math.floor(timeStamp / 60) / 24);
    var hh = Math.floor((timeStamp - day * 24 * 60) / 60);
    var mm = timeStamp - day * 24 * 60 - hh * 60;

    return addTime(day, hh, mm, bankTimeZone);
}

/**
 * @param {Object} schedule – Расписание Банды
 * @param {Number} duration - Время на ограбление в минутах
 * @param {Object} workingHours – Время работы банка
 * @param {String} workingHours.from – Время открытия, например, "10:00+5"
 * @param {String} workingHours.to – Время закрытия, например, "18:00+5"
 * @returns {Object}
 */
exports.getAppropriateMoment = function (schedule, duration, workingHours) {
    freeIntervals = [{
        start: 0,
        end: END_OF_THE_WEEK
    }];
    var busyIntervals = [];
    for (var i = 0; i < Object.keys(schedule).length; i++) {
        busyIntervals = busyIntervals.concat(schedule[Object.keys(schedule)[i]]);
    }
    reduceToGather(busyIntervals);
    correlateWithBank(workingHours);
    filterDuration(duration);

    var lastSuccess = (freeIntervals.length > 0)
        ? convertToTargetTimeZoneDate(freeIntervals[0].start)
        : null;

    return {

        /**
         * Найдено ли время
         * @returns {Boolean}
         */
        exists: function () {
            return lastSuccess !== null;
        },

        /**
         * Возвращает отформатированную строку с часами для ограбления
         * Например,
         *   "Начинаем в %HH:%MM (%DD)" -> "Начинаем в 14:59 (СР)"
         * @param {String} template
         * @returns {String}
         */
        format: function (template) {
            if (lastSuccess === null) {
                return '';
            }
            var hours = lastSuccess.hh < 10 ? '0' + lastSuccess.hh.toString() : lastSuccess.hh;
            var minutes = lastSuccess.mm < 10 ? '0' + lastSuccess.mm.toString() : lastSuccess.mm;
            template = template.replace('%HH', hours);
            template = template.replace('%MM', minutes);
            template = template.replace('%DD', Object.keys(days).filter(
                function (key) {
                    return days[key] === lastSuccess.dd;
                }
            )[0]);

            return template;
        },

        /**
         * Попробовать найти часы для ограбления позже [*]
         * @star
         * @returns {Boolean}
         */
        tryLater: function () {
            if (lastSuccess === null || freeIntervals.length === 0) {
                return false;
            }
            reduceFreeIntervals(freeIntervals[0].start, freeIntervals[0].start + 30);
            filterDuration(duration);
            if (freeIntervals.length === 0) {
                return false;
            }
            lastSuccess = convertToTargetTimeZoneDate(freeIntervals[0].start);

            return true;
        }
    };
};
