"use strict";

function selectToday(tasks, date) {
  const dated = tasks.filter(task => task.fields.date === date);
  const mains = dated.filter(task => task.fields.priority === "P1");
  const main = mains[0] || null;
  const body = dated.find(task => !task.done && task.fields.module === "body") || null;
  const invalid = [
    ...tasks.filter(task => !task.fields.task_id || !task.fields.date || !task.fields.module),
    ...mains.slice(1)
  ];
  const excluded = new Set([main, body, ...invalid].filter(Boolean));
  const others = dated.filter(task => !excluded.has(task));
  return { main, body, others, invalid };
}

module.exports = { selectToday };
