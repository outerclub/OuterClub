goog.provide('oc.Util');
goog.require('goog.date');

/**
 * @param {string} str
 * @return {string}
 */
oc.Util.replaceLinks = function(str) {
    var url_pattern = /(\()((?:ht|f)tps?:\/\/[a-z0-9\-._~!$&'()*+,;=:\/?#[\]@%]+)(\))|(\[)((?:ht|f)tps?:\/\/[a-z0-9\-._~!$&'()*+,;=:\/?#[\]@%]+)(\])|(\{)((?:ht|f)tps?:\/\/[a-z0-9\-._~!$&'()*+,;=:\/?#[\]@%]+)(\})|(<|&(?:lt|#60|#x3c);)((?:ht|f)tps?:\/\/[a-z0-9\-._~!$&'()*+,;=:\/?#[\]@%]+)(>|&(?:gt|#62|#x3e);)|((?:^|[^=\s'"\]])\s*['"]?|[^=\s]\s+)(\b(?:ht|f)tps?:\/\/[a-z0-9\-._~!$'()*+,;=:\/?#[\]@%]+(?:(?!&(?:gt|#0*62|#x0*3e);|&(?:amp|apos|quot|#0*3[49]|#x0*2[27]);[.!&',:?;]?(?:[^a-z0-9\-._~!$&'()*+,;=:\/?#[\]@%]|$))&[a-z0-9\-._~!$'()*+,;=:\/?#[\]@%]*)*[a-z0-9\-_~$()*+=\/#[\]@%])/img;
    var url_replace = '$1$4$7$10$13<a class="external" target="_blank" href="$2$5$8$11$14">$2$5$8$11$14</a>$3$6$9$12';
    return str.replace(url_pattern, url_replace);
};

/**
 * @param {goog.date.Date} date
 * @return {string}
 */
oc.Util.weekDayHuman = function(date) {
    var ret = '';
    switch (date.getDay()) {
        case goog.date.weekDay.MON:
            ret = "Monday";
            break;
        case goog.date.weekDay.TUE:
            ret = "Tuesday";
            break;
        case goog.date.weekDay.WED:
            ret = "Wednesday";
            break;
        case goog.date.weekDay.THU:
            ret = "Thursday";
            break;
        case goog.date.weekDay.FRI:
            ret = "Friday";
            break;
        case goog.date.weekDay.SAT:
            ret = "Saturday";
            break;
        case goog.date.weekDay.SUN:
            ret = "Sunday";
            break;
    }
    return ret;
};

/**
 * @param {goog.date.Date} date
 * @return {string}
 */
oc.Util.humanMonth = function(date) {
    var ret = '';
    switch (date.getMonth()) {
        case goog.date.month.JAN:
            ret = "January";
            break;
        case goog.date.month.FEB:
            ret = "February";
            break;
        case goog.date.month.MAR:
            ret = "March";
            break;
        case goog.date.month.APR:
            ret = "April";
            break;
        case goog.date.month.MAY:
            ret = "May";
            break;
        case goog.date.month.JUN:
            ret = "June";
            break;
        case goog.date.month.JUL:
            ret = "July";
            break;
        case goog.date.month.AUG:
            ret = "August";
            break;
        case goog.date.month.SEP:
            ret = "September";
            break;
        case goog.date.month.OCT:
            ret = "October";
            break;
        case goog.date.month.NOV:
            ret = "November";
            break;
        case goog.date.month.DEC:
            ret = "December";
            break; 
    };
    return ret;
};

/**
 * @param {goog.date.DateTime} date
 * @return {string}
 */
oc.Util.prettyDate = function(date) {
    var diff = (((new Date()).getTime() - date.getTime()) / 1000),
		day_diff = Math.floor(diff / 86400);
    var ret = "";
    if (day_diff == 0 ) {
        if (diff < 60)
            ret = "just now";
        else if (diff < 120)
           ret = "1 minute ago";
        else if (diff < 3600)
           ret = Math.floor(diff/60)+" minutes ago";
        else if (diff < 7200)
            ret = "1 hour ago";
        else if (diff < 86400)
            ret = Math.floor(diff/3600)+" hours ago";
    } else if (day_diff == 1) {
        ret = "Yesterday";
    } else if (day_diff < 7) {
        ret = day_diff +" days ago";
    } else if (day_diff < 31) {
        ret = Math.ceil(day_diff/7)+" weeks ago";
    } else 
        ret = date.getDate()+" "+oc.Util.humanMonth(date) +", "+date.toUsTimeString();
    return ret;
}

/**
 * @param {goog.date.DateTime} date
 * @return {string}
 */
oc.Util.humanDate = function(date) {
    var today = new goog.date.DateTime();
    var ret;
    if (goog.date.isSameDay(today,date)) {
        ret = date.toUsTimeString();
    } else {
        
        ret = oc.Util.humanMonth(date)+" "+date.getDate()+", "+date.toUsTimeString();
    }
    
    return ret;
    
};
