const fs = require('fs');

const date = require('date-and-time');
const nunjucks = require('nunjucks');
const { dirname, basename } = require('path');
//const createSchedule = require('./src/schedule/script/create-schedule');
const createCalendarWidget = require('./src/_includes/calendar-widget/script/create-widget.js');
const { dateStrToTimestamp } = require('./src/utils/date-helper.js');

const {
  utcOffset,
  path: confboxPath,
  extraSchedule,
} = require('./lib/confbox-config');

function buildScheduleData(sessions, speakers, { basic = false } = {}) {
  const schedule = [
    ...sessions.map(session => {
      const obj = {
        start: session.data.start,
        end: session.data.end,
        title: session.data.title,
        speakers: session.data.speakers,
        session: true,
        livestreamed: true,
        fileSlug: session.fileSlug,
      };

      if (!basic) {
        obj.topics = session.data.topics;
        obj.avatar = session.data.avatar;
        obj.body = session.data.description;
      }

      return obj;
    }),
    ...extraSchedule.map(obj => ({ ...obj })),
  ].map(item => {
    // Convert dates to timestamps
    item.start = dateStrToTimestamp(item.start, utcOffset);
    item.end = dateStrToTimestamp(item.end, utcOffset);

    // Wrap URLs in confboxAsset
    for (const key of ['icon', 'avatar']) {
      if (item[key]) item[key] = `confboxAsset(${item[key]})`;
    }

    if (item.speakers) {
      item.speakers = item.speakers.map(speakerId => {
        const speaker = speakers.find(s => s.fileSlug == speakerId);
        if (!speaker) throw new Error(`Could not find speaker: ${speakerId}`);
        return {
          name: speaker.data.name,
          avatar: `confboxAsset(${speaker.data.avatar ||
            '/assets/speakers/default.svg'})`,
          title: speaker.data.title,
          link: speaker.data.link,
        };
      });
    }

    return item;
  });

  schedule.sort((a, b) => (a.start < b.start ? -1 : 1));

  return schedule;
}

class ModularClassName {
  constructor(output) {
    this._output = output;
    this._cache = new Map();
  }
  _getData(css) {
    if (!css.startsWith('/')) {
      throw new TypeError('CSS path must be absolute (starts with /)');
    }

    if (!this._cache.has(css)) {
      const file = this._output + css + '.json';
      const json = fs.readFileSync(file, {
        encoding: 'utf8',
      });
      this._cache.set(css, JSON.parse(json));
    }

    return this._cache.get(css);
  }
  getClassName(css, className) {
    const data = this._getData(css);

    if (!(className in data)) {
      throw new TypeError(`Cannot find className "${className}" in ${css}`);
    }

    return data[className];
  }
  getAllCamelCased(css) {
    const output = {};
    const data = this._getData(css);

    for (const [key, val] of Object.entries(data)) {
      output[key.replace(/-\w/g, match => match[1].toUpperCase())] = val;
    }

    return output;
  }
}

module.exports = function(eleventyConfig) {
  const config = {
    dir: {
      input: 'src',
      output: '.build-tmp',
    },
    pathPrefix: confboxPath,
  };

  const modCSS = new ModularClassName(config.dir.output);

  /** Get a class name from a CSS module */
  eleventyConfig.addShortcode('className', (css, className) => {
    return modCSS.getClassName(css, className);
  });

  const cssPerPage = new Map();

  // This is to hack around https://github.com/11ty/eleventy/issues/638
  eleventyConfig.addShortcode('pageStart', page => {
    cssPerPage.set(page.url, new Set());
    return '';
  });

  eleventyConfig.addShortcode(
    'speakerAttr',
    (collections, speakerId, attr, fallback) => {
      const speaker = collections.speakers.find(speaker =>
        speaker.inputPath.endsWith(`/${speakerId}.md`),
      );
      if (!speaker) {
        throw Error(`Unknown speaker ${speakerId}`);
      }
      return speaker.data[attr] || fallback;
    },
  );

  /** Add some CSS, deduping anything along the way */
  eleventyConfig.addShortcode('css', (page, url) => {
    if (!cssPerPage.has(page.url)) {
      cssPerPage.set(page.url, new Set());
    }

    const set = cssPerPage.get(page.url);

    if (set.has(url)) return '';
    set.add(url);

    return new nunjucks.runtime.SafeString(
      `<style>confboxInline(confboxAsset(${url}))</style>`,
    );
  });

  eleventyConfig.addShortcode('headingSlug', str => {
    return new nunjucks.runtime.SafeString(
      str.replace(
        /\s/g,
        () =>
          `<span class=${modCSS.getClassName(
            '/_includes/module.css',
            'slug-dash',
          )}></span>`,
      ),
    );
  });

  eleventyConfig.addShortcode('idify', str => {
    return str.toLowerCase().replace(/\s/g, '-');
  });

  eleventyConfig.addShortcode('schedule', (sessions, speakers) => {
    return new nunjucks.runtime.SafeString(
      createSchedule(
        buildScheduleData(sessions, speakers),
        utcOffset,
        utcOffset,
        modCSS.getAllCamelCased('/schedule/style.css'),
        confboxPath,
      ),
    );
  });

  eleventyConfig.addShortcode('calendarWidget', date => {
    return new nunjucks.runtime.SafeString(
      createCalendarWidget(
        dateStrToTimestamp(date, utcOffset),
        utcOffset,
        modCSS.getAllCamelCased('/_includes/calendar-widget/style.css'),
      ),
    );
  });

  /** Format a date in the timezone of the conference */
  eleventyConfig.addShortcode('confDate', (timestamp, format) => {
    if (typeof timestamp === 'string') {
      timestamp = dateStrToTimestamp(timestamp, utcOffset);
    }
    const offsetTime = new Date(timestamp.valueOf() + utcOffset);
    return date.format(offsetTime, format);
  });

  /** Turn a local date string into a timestamp */
  eleventyConfig.addShortcode(
    'timestamp',
    // Have to cast to string else Nunjucks shits the bed.
    dateStr => dateStrToTimestamp(dateStr, utcOffset) + '',
  );

  /** Dump JSON data in a way that's safe to be output in HTML */
  eleventyConfig.addShortcode('json', obj => {
    return JSON.stringify(obj)
      .replace(/<!--/g, '<\\!--')
      .replace(/<script/g, '<\\script')
      .replace(/<\/script/g, '<\\/script');
  });

  /** Get an ISO 8601 version of a date */
  eleventyConfig.addShortcode('isoDate', timestamp => {
    return new Date(timestamp.valueOf()).toISOString();
  });

  eleventyConfig.addCollection('faqs', collection => {
    const faqs = collection
      .getFilteredByTag('faq')
      .sort((a, b) => (a.inputPath < b.inputPath ? -1 : 1));

    const sections = [];
    let section;

    for (const faq of faqs) {
      const folder = basename(dirname(faq.data.page.inputPath));
      if (!section || section.folder !== folder || faq.data.question) {
        section = {
          title: faq.data.question ? faq.data.title : faq.data.sectionTitle,
          question: faq.data.question
            ? faq.data.question
            : faq.data.sectionQuestion,
          answer: faq.data.question ? faq.data.answer : faq.data.sectionAnswer,
          folder,
          items: [],
        };
        sections.push(section);
      }

      section.items.push(faq);
    }

    return sections;
  });

  eleventyConfig.addCollection('jsSchedule', collection => {
    return buildScheduleData(
      collection.getFilteredByTag('session'),
      collection.getFilteredByTag('speakers'),
    );
  });

  eleventyConfig.addCollection('jsScheduleBasic', collection => {
    return buildScheduleData(
      collection.getFilteredByTag('session'),
      collection.getFilteredByTag('speakers'),
      { basic: true },
    );
  });

  return config;
};
