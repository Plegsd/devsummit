const icalGenerator = require('./utils/ical-generator');
const { dateStrToTimestamp } = require('./utils/date-helper.js');

module.exports = class iCal {
  data() {
    return {
      permalink: 'fullevent.ics',
    };
  }

  render({ conf, collections }) {
    const events = collections.session
      ? collections.session.map(session => ({
          name: `${session.data.title} - ${conf.conferenceName}`,
          start: dateStrToTimestamp(session.data.start, conf.utcOffset),
          end: dateStrToTimestamp(session.data.end, conf.utcOffset),
        }))
      : [{ name: conf.conferenceName, start: conf.start, end: conf.end }];

    return icalGenerator(conf.conferenceName, events);
  }
};
