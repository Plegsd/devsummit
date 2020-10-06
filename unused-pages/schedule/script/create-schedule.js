const { monthsShort } = require('../../script/date');
const { html } = require('../../script/escape-html');

module.exports = function createScheduleHtml(
  items,
  venueOffset,
  utcOffset,
  classNameMap,
  confPath,
) {
  let currentMonth = '';
  let currentDate = 0;

  const isVenueOffset = venueOffset === utcOffset;
  const days = [];
  let day;

  for (const item of items) {
    const itemDate = new Date(item.start + utcOffset);
    const date = itemDate.getUTCDate();
    const month = itemDate.getUTCMonth();

    if (date !== currentDate || month !== currentMonth) {
      currentDate = date;
      currentMonth = month;
      day = { date, month, items: [] };
      days.push(day);
    }

    day.items.push(item);
  }

  return html`
    <section class="${classNameMap.schedule}">
      ${days.map(
        ({ date, month, items }, dayNum) => html`
          <div class="${classNameMap.day}">
            <h1 class="${classNameMap.date}">
              <span class="${classNameMap.dateName}"
                >${monthsShort[month]}</span
              >
              <span class="${classNameMap.dateNumber}">${date}</span>
            </h1>
            ${!isVenueOffset
              ? ''
              : html`
                  <div class="${classNameMap.dayTitle}">
                    Day
                    <span class="${classNameMap.dayNumber}">${dayNum + 1}</span>
                  </div>
                `}
            <div
              class="${`${classNameMap.timeLine} ${classNameMap.dayGap}`}"
            ></div>

            ${items.map(item => {
              const sessionDate = new Date(item.start + utcOffset);
              const hours = sessionDate.getUTCHours();
              const minutes = sessionDate.getUTCMinutes();

              return html`
                <div class="${classNameMap.timeLine}">
                  <div class="${classNameMap.timeLineContent}">
                    ${item.icon
                      ? html`
                          <div
                            class="${classNameMap.iconBubble} ${classNameMap.iconBorder}"
                          >
                            <img
                              class="${classNameMap.icon}"
                              src="${item.icon}"
                              alt=""
                            />
                          </div>
                        `
                      : item.avatar
                      ? html`
                          <div class="${classNameMap.iconBubble}">
                            <div class="${classNameMap.avatars}">
                              <img src="${item.avatar}" alt="" />
                            </div>
                          </div>
                        `
                      : item.speakers
                      ? html`
                          <div class="${classNameMap.iconBubble}">
                            <div class="${classNameMap.avatars}">
                              ${item.speakers.map(
                                speaker => html`
                                  <img
                                    src="${speaker.avatar}"
                                    alt="${speaker.name}"
                                  />
                                `,
                              )}
                            </div>
                          </div>
                        `
                      : html`
                          <div class="${classNameMap.dot}"></div>
                        `}
                    <h2 class="${classNameMap.time}">
                      <time>
                        ${hours % 12 || 12}${minutes
                          ? ':' + minutes.toString().padStart(2, '0')
                          : ''}
                        <span class="${classNameMap.amPm}"
                          >${hours < 12 ? 'am' : 'pm'}</span
                        >
                      </time>
                    </h2>
                  </div>
                </div>
                <div class="${classNameMap.item}">
                  ${item.body
                    ? html`
                        <div class="${classNameMap.sessionItem}">
                          <h3 class="${classNameMap.sessionItemTitle}">
                            <a
                              class="${classNameMap.sessionLink}"
                              href="${confPath}sessions/${item.fileSlug}/"
                              >${item.title}</a
                            >
                          </h3>
                          <div><p>${item.body}</p></div>
                          <div class="${classNameMap.meta}">
                            ${item.topics
                              ? html`
                                  <ul class="${classNameMap.topicList}">
                                    ${item.topics.map(
                                      topic => html`
                                        <li>
                                          <div class="${classNameMap.topic}">
                                            ${topic}
                                          </div>
                                        </li>
                                      `,
                                    )}
                                  </ul>
                                `
                              : ''}
                            <a href="${confPath}sessions/${item.fileSlug}/"
                              >Read more</a
                            >
                          </div>
                        </div>
                      `
                    : html`
                        <h3
                          class="${`${classNameMap.basicItemTitle} ${
                            !item.icon && !item.speakers
                              ? classNameMap.basicItemTitleDotAlign
                              : ''
                          }`}"
                        >
                          ${item.title}
                        </h3>
                      `}
                </div>
                <div class="${classNameMap.rowGap}"></div>
              `;
            })}

            <div class="${classNameMap.end}"></div>
          </div>
        `,
      )}
    </section>
  `.toString();
  // Nunjucks has bugs with String objects, so we to toString to get a primitive.
};
