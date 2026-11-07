// SPDX-FileCopyrightText: 2018-2026 Guillaume Vara <guillaume.vara@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// Chart.js, only what a pie needs : imported by StatsPanel when the panel first opens, for a file of its own
import { ArcElement, Chart, PieController, Tooltip } from 'chart.js';
import { nextSelected, offsetsOf, type Slices, tooltipText } from './slices';

Chart.register(PieController, ArcElement, Tooltip);

// as much on hover as when selected. Chart.js takes the room from the pie, a few pixels smaller while a slice is selected
const PULL_OUT = 10;

export function createPie(canvas: HTMLCanvasElement, { labels, values, colors }: Slices, series: string, format: string) {
  const total = values.reduce((sum, value) => sum + value, 0);
  let selected: number | null = null;

  return new Chart(canvas, {
    type: 'pie',
    data: {
      labels,
      datasets: [
        { data: values, backgroundColor: colors, borderWidth: 1, hoverOffset: PULL_OUT, offset: offsetsOf(values.length, null, PULL_OUT) },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      // as Highcharts left around them
      layout: { padding: 22 },
      onClick: (_event, elements, chart) => {
        const dataset = chart.data.datasets[0];
        if (!dataset) return;
        selected = nextSelected(selected, elements[0]?.index);
        (dataset as { offset?: number[] }).offset = offsetsOf(values.length, selected, PULL_OUT);
        chart.update();
      },
      plugins: {
        tooltip: {
          backgroundColor: 'rgba(247, 247, 247, 0.85)',
          titleColor: '#333333',
          bodyColor: '#333333',
          borderColor: '#cccccc',
          borderWidth: 1,
          callbacks: {
            label: item => tooltipText(format, item.raw as number, total, series),
          },
        },
      },
    },
  });
}
