let currentData = null;

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function init() {
  const picker = document.getElementById('date-picker');
  picker.value = getToday();
  picker.addEventListener('change', () => loadData(picker.value));
  loadData(getToday());
  initExport();
}

async function loadData(date) {
  const content = document.getElementById('content');
  const noData = document.getElementById('no-data');
  const updateTime = document.getElementById('update-time');
  const liveDot = document.getElementById('live-dot');

  content.innerHTML = '<div class="loading">正在加载数据</div>';
  noData.classList.add('hidden');
  liveDot.classList.add('hidden');
  updateTime.textContent = '';

  try {
    const res = await fetch(`data/${date}.json`);
    if (!res.ok) throw new Error('not found');
    const data = await res.json();
    currentData = { ...data, date };

    if (data.updated_at) {
      updateTime.textContent = `更新于 ${data.updated_at}`;
      liveDot.classList.remove('hidden');
    }

    content.innerHTML = '';
    noData.classList.add('hidden');
    renderAll(content, data);
  } catch (e) {
    content.innerHTML = '';
    noData.classList.remove('hidden');
    currentData = null;
  }
}

function changeClass(val) {
  if (val > 0) return 'up';
  if (val < 0) return 'down';
  return 'flat';
}

function fmtSign(val) {
  if (val > 0) return '+';
  return '';
}

function renderAll(container, data) {
  renderSection1(container, data.section1);
  renderSection2(container, data.section2);
  renderSection3(container, data.section3);
  renderSection4(container, data.section4);
  renderSection5(container, data.section5);
  renderSection6(container, data.section6);
  renderSection7(container, data.section7);
}

function makeCard(title, badge) {
  const card = document.createElement('div');
  card.className = 'card';
  const head = document.createElement('div');
  head.className = 'card-head';
  let badgeHtml = badge ? `<span class="badge">${badge}</span>` : '';
  head.innerHTML = `<h2>${title}</h2>${badgeHtml}`;
  card.appendChild(head);
  const body = document.createElement('div');
  body.className = 'card-body';
  card.appendChild(body);
  return { card, body };
}

function renderSection1(container, s) {
  const { card, body } = makeCard('一、' + s.title);

  for (const tierKey of ['T1', 'T2', 'T3']) {
    const tier = s.tiers[tierKey];
    if (!tier) continue;
    const label = document.createElement('div');
    label.className = 'tier-label';
    label.textContent = tier.label;
    body.appendChild(label);

    for (const ex of tier.exchanges) {
      const line = document.createElement('div');
      line.className = 'exchange-line';
      let coinsText = '';
      if (ex.coins && ex.coins.length > 0) {
        const parts = [];
        const minor = [];
        for (const c of ex.coins) {
          if (c.volume_label === '交易额较少') {
            minor.push(c.symbol);
          } else {
            parts.push(`${c.symbol} ${c.volume_label}`);
          }
        }
        if (minor.length > 0) {
          parts.push(`${minor.join('，')}，交易额较少`);
        }
        coinsText = parts.join('，');
      }
      const newCls = ex.new > 0 ? ' has-new' : '';
      line.innerHTML = `<span class="name">${ex.name}</span>` +
        `<span class="count${newCls}">上新+${ex.new}（累计+${ex.cumulative}）</span>` +
        (coinsText ? `：<span class="coins">${coinsText}</span>` : '：');
      body.appendChild(line);
    }
  }

  container.appendChild(card);
}

function fmtVolume(raw, dewatered) {
  const YI = 100000000;
  const WAN = 10000;

  function fmt(v) {
    if (v >= YI) return (v / YI).toFixed(2) + '亿';
    return (v / WAN).toFixed(2) + 'wU';
  }

  let text = '交易额 ' + fmt(raw);
  if (dewatered != null) text += '，去水额 ' + fmt(dewatered);
  return text;
}

function renderSection2(container, s) {
  const { card, body } = makeCard('二、' + s.title, s.threshold);

  for (const group of s.groups) {
    const label = document.createElement('div');
    label.className = 'tier-label';
    label.textContent = group.label;
    body.appendChild(label);

    let byExchange = {};
    for (const item of group.items) {
      if (!byExchange[item.exchange]) byExchange[item.exchange] = [];
      byExchange[item.exchange].push(item);
    }

    for (const [exName, items] of Object.entries(byExchange)) {
      const grp = document.createElement('div');
      grp.className = 'asset-group';
      grp.innerHTML = `<div class="ex-name">${exName}</div>`;
      for (const item of items) {
        const line = document.createElement('div');
        line.className = 'asset-line';
        line.innerHTML = `<span class="sym">${item.symbol}</span>: <span class="mono">${fmtVolume(item.volume, item.dewatered)}</span>`;
        grp.appendChild(line);
      }
      body.appendChild(grp);
    }
  }

  container.appendChild(card);
}

function renderShareSection(container, num, s, isNew) {
  const prefix = isNew ? '新资产' : '存量资产';
  const { card, body } = makeCard(`${num}、${s.title}`, s.subtitle);

  const grid = document.createElement('div');
  grid.className = 'share-grid';

  grid.innerHTML = `
    <div class="share-block">
      <div class="label">HTX ${prefix}公开份额</div>
      <div class="value">${s.htx_public_share}%</div>
    </div>
    <div class="share-block">
      <div class="label">HTX ${prefix}去水份额</div>
      <div class="value">${s.htx_dewatered_share}%</div>
    </div>
    <div class="share-block">
      <div class="label">HTX ${prefix}交易额（去水）</div>
      <div class="value">${s.htx_dewatered_volume} U</div>
      <div class="meta">
        日环比 <span class="${changeClass(s.htx_day_change)}">${fmtSign(s.htx_day_change)}${s.htx_day_change}%</span>
        &nbsp; 周同比 <span class="${changeClass(s.htx_week_change)}">${fmtSign(s.htx_week_change)}${s.htx_week_change}%</span>
      </div>
    </div>
    <div class="share-block">
      <div class="label">主要竞品市场交易额（去水）</div>
      <div class="value">${s.market_dewatered_volume} U</div>
      <div class="meta">
        日环比 <span class="${changeClass(s.market_day_change)}">${fmtSign(s.market_day_change)}${s.market_day_change}%</span>
        &nbsp; 周同比 <span class="${changeClass(s.market_week_change)}">${fmtSign(s.market_week_change)}${s.market_week_change}%</span>
      </div>
    </div>
  `;

  body.appendChild(grid);
  container.appendChild(card);
}

function renderSection3(container, s) {
  renderShareSection(container, '三', s, true);
}

function renderSection6(container, s) {
  renderShareSection(container, '六', s, false);
}

function renderSection4(container, s) {
  const { card, body } = makeCard('四、' + s.title);

  const rows = [
    { label: '昨日现货交易人数', d: s.trading_users, topLabel: '昨日现货交易人数', rateLabel: '新资产交易人数对现货贡献率' },
    { label: '昨日拉新首次交易人数', d: s.new_users, topLabel: '昨日拉新首次交易人数', rateLabel: '对平台贡献率' },
    { label: '昨日激活沉默交易人数', d: s.reactivated_users, topLabel: '昨日激活沉默交易人数', rateLabel: '对平台贡献率' }
  ];

  for (const r of rows) {
    const div = document.createElement('div');
    div.className = 'contrib-row';
    div.innerHTML = `${r.label} <span class="num">${r.d.count}人</span>，` +
      `${r.rateLabel} <span class="rate">${r.d.rate}%</span>` +
      ` <span class="top">（${r.d.top_coin} ${r.topLabel} ${r.d.top_count}）</span>`;
    body.appendChild(div);
  }

  container.appendChild(card);
}

function renderDetailTable(container, num, s, showDays) {
  const { card, body } = makeCard(`${num}、${s.title}`, s.subtitle);

  const wrap = document.createElement('div');
  wrap.className = 'overflow-x';

  let cols = showDays
    ? ['币种', '已上线', '去水交易额', '交易人数', '涨幅', '拉新', '激活沉默']
    : ['币种', '去水交易额', '交易人数', '涨幅', '拉新', '激活沉默'];

  let headerHtml = cols.map(c => `<th>${c}</th>`).join('');

  let rowsHtml = '';
  for (const a of s.assets) {
    const cls = changeClass(parseFloat(a.change));
    if (showDays) {
      rowsHtml += `<tr>
        <td>${a.symbol}</td>
        <td class="mono">${a.days_listed}天</td>
        <td class="mono">${a.dewatered}</td>
        <td class="mono">${a.traders}</td>
        <td class="change-cell ${cls}">${a.change}</td>
        <td class="mono">${a.new_users}人</td>
        <td class="mono">${a.reactivated}人</td>
      </tr>`;
    } else {
      rowsHtml += `<tr>
        <td>${a.symbol}</td>
        <td class="mono">${a.dewatered}</td>
        <td class="mono">${a.traders}</td>
        <td class="change-cell ${cls}">${a.change}</td>
        <td class="mono">${a.new_users}人</td>
        <td class="mono">${a.reactivated}人</td>
      </tr>`;
    }
  }

  wrap.innerHTML = `<table class="detail-table"><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>`;
  body.appendChild(wrap);
  container.appendChild(card);
}

function renderSection5(container, s) {
  renderDetailTable(container, '五', s, true);
}

function renderSection7(container, s) {
  if (s.groups) {
    renderGroupedDetailTable(container, '七', s);
  } else {
    renderDetailTable(container, '七', s, false);
  }
}

function renderGroupedDetailTable(container, num, s) {
  const { card, body } = makeCard(`${num}、${s.title}`, s.subtitle);
  const cols = ['币种', '去水交易额', '交易人数', '涨幅', '拉新', '激活沉默'];
  const colCount = cols.length;
  const headerHtml = cols.map(c => `<th>${c}</th>`).join('');

  let bodyHtml = '';
  for (const group of s.groups) {
    bodyHtml += `<tr class="group-header-row"><td colspan="${colCount}">${group.label}</td></tr>`;
    for (const a of group.assets) {
      const cls = changeClass(parseFloat(a.change));
      bodyHtml += `<tr>
        <td>${a.symbol}</td>
        <td class="mono">${a.dewatered}</td>
        <td class="mono">${a.traders}</td>
        <td class="change-cell ${cls}">${a.change}</td>
        <td class="mono">${a.new_users}人</td>
        <td class="mono">${a.reactivated}人</td>
      </tr>`;
    }
  }

  const wrap = document.createElement('div');
  wrap.className = 'overflow-x';
  wrap.innerHTML = `<table class="detail-table"><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
  body.appendChild(wrap);
  container.appendChild(card);
}

// Export
function initExport() {
  const btn = document.getElementById('export-btn');
  const panel = document.getElementById('export-panel');

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.classList.toggle('open');
  });

  document.addEventListener('click', () => panel.classList.remove('open'));

  panel.querySelector('[data-format="copy"]').addEventListener('click', () => {
    if (!currentData) return;
    const text = buildPlainText(currentData);
    navigator.clipboard.writeText(text).then(() => showToast());
    panel.classList.remove('open');
  });
}

function showToast() {
  const toast = document.getElementById('export-toast');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1800);
}

function buildPlainText(data) {
  let out = `资产早报[${data.date}]\n\n`;

  // Section 1
  const s1 = data.section1;
  out += `**一、${s1.title}**\n`;
  for (const tierKey of ['T1', 'T2', 'T3']) {
    const tier = s1.tiers[tierKey];
    if (!tier) continue;
    out += `**${tier.label}：**\n`;
    for (const ex of tier.exchanges) {
      let line = `${ex.name}上新+${ex.new}（累计+${ex.cumulative}）：`;
      if (ex.coins && ex.coins.length > 0) {
        const parts = [];
        const minor = [];
        for (const c of ex.coins) {
          if (c.volume_label === '交易额较少') {
            minor.push(c.symbol);
          } else {
            parts.push(`${c.symbol} ${c.volume_label}`);
          }
        }
        if (minor.length > 0) parts.push(`${minor.join('，')}，交易额较少`);
        line += parts.join('，');
      }
      out += line + '\n';
    }
    out += '\n';
  }

  // Section 2
  const s2 = data.section2;
  out += `**二、${s2.title}：**\n`;
  for (const group of s2.groups) {
    out += `**${group.label}**\n`;
    let byEx = {};
    for (const item of group.items) {
      if (!byEx[item.exchange]) byEx[item.exchange] = [];
      byEx[item.exchange].push(item);
    }
    for (const [exName, items] of Object.entries(byEx)) {
      out += exName + '\n';
      for (const item of items) {
        out += `${item.symbol}: ${fmtVolume(item.volume, item.dewatered)}\n`;
      }
    }
    out += '\n';
  }

  // Section 3
  const s3 = data.section3;
  out += `**三、${s3.title}（${s3.subtitle}）：**\n`;
  out += `昨日 HTX 新资产公开份额 ${s3.htx_public_share}%，去水份额 ${s3.htx_dewatered_share}% HTX 新资产\n`;
  out += `交易额（去水）${s3.htx_dewatered_volume} U，日环比 ${fmtSign(s3.htx_day_change)}${s3.htx_day_change}%，周同比 ${fmtSign(s3.htx_week_change)}${s3.htx_week_change}%\n`;
  out += `主要竞品市场新资产交易额（去水）${s3.market_dewatered_volume} U，日环比 ${fmtSign(s3.market_day_change)}${s3.market_day_change}%，周同比 ${fmtSign(s3.market_week_change)}${s3.market_week_change}%\n\n`;

  // Section 4
  const s4 = data.section4;
  out += `**四、${s4.title}：**\n`;
  out += `昨日现货交易人数 ${s4.trading_users.count}人，新资产交易人数对现货贡献率 ${s4.trading_users.rate}%（${s4.trading_users.top_coin}昨日现货交易人数${s4.trading_users.top_count}）。\n`;
  out += `昨日拉新首次交易人数${s4.new_users.count}人，对平台贡献率 ${s4.new_users.rate}%（${s4.new_users.top_coin}昨日拉新首次交易人数${s4.new_users.top_count}）。\n`;
  out += `昨日激活沉默交易人数 ${s4.reactivated_users.count}人，对平台贡献率 ${s4.reactivated_users.rate}%（${s4.reactivated_users.top_coin}昨日激活沉默交易人数${s4.reactivated_users.top_count}）。\n\n`;

  // Section 5
  const s5 = data.section5;
  out += `**五、${s5.title}（${s5.subtitle}）**\n`;
  for (const a of s5.assets) {
    out += `${a.symbol} 已上线${a.days_listed}天，昨日去水交易额${a.dewatered}，交易人数${a.traders}，收盘涨幅${a.change}，拉新首次交易${a.new_users}人，激活沉默${a.reactivated}人；\n`;
  }
  out += '\n';

  // Section 6
  const s6 = data.section6;
  out += `**六、${s6.title}（${s6.subtitle}）：**\n`;
  out += `昨日 HTX 存量资产公开份额 ${s6.htx_public_share}%，去水份额 ${s6.htx_dewatered_share}%\n`;
  out += `交易额（去水）${s6.htx_dewatered_volume} U，日环比 ${fmtSign(s6.htx_day_change)}${s6.htx_day_change}%，周同比 ${fmtSign(s6.htx_week_change)}${s6.htx_week_change}%\n`;
  out += `主要竞品市场日交易额（去水）${s6.market_dewatered_volume} U，日环比 ${fmtSign(s6.market_day_change)}${s6.market_day_change}%，周同比 ${fmtSign(s6.market_week_change)}${s6.market_week_change}%\n\n`;

  // Section 7
  const s7 = data.section7;
  out += `**七、${s7.title}（${s7.subtitle}）**\n`;
  const s7assets = s7.groups
    ? s7.groups.flatMap(g => g.assets)
    : s7.assets;
  for (const a of s7assets) {
    out += `${a.symbol}：昨日去水交易额 ${a.dewatered}，交易人数 ${a.traders}，收盘涨幅 ${a.change}，拉新首次交易 ${a.new_users}人，激活沉默 ${a.reactivated}人；\n`;
  }

  return out;
}

document.addEventListener('DOMContentLoaded', init);
