let gData;
let gRegions = [];
let gThresholds = {
  carriers: 0,
  discharged: 0,
  deaths: 0,
  pcrtested: 0
};

let gLocalGov = {
  "prefectures-data": {
    deaths: []
  },
  "transition": {
    deaths: []
  }
};

const LANG = $("html").attr("lang");
const COLORS = {
  default: "#3DC",
  carriers: ["#3DC", "#FEA", "#ABC"],
  cases: ["#6DF"],
  deaths: ["#EB8", "#ABC"],
  discharged: ["#9FC"],
  serious: ["#FEA"],
  pcrtested: ["#4CD"],
  dark: "#399",
  selected: "#EC2",
  checking: "#abc",
  gender: {
    f: "#FE9",
    m: "#2B9"
  }
};
const LABELS = {
  ja: {
    change: "前日比",
    total: "合計",
    transition: {
      carriers: ["有症状", "無症状", "確認中"],
      cases: ["患者数"],
      discharged: ["退院者数"],
      deaths: ["確認済み", "都道府県発表との差"],
      pcrtested: ["PCR検査人数"],
      serious: ["重症者数"]
    },
    unit: {
      carriers: "名",
      cases: "名",
      discharged: "名",
      pcrtested: "名",
      serious: "名",
      deaths: "名",
      doubling: "日"
    },
    demography: {
      deaths: "死亡",
      serious: "重症",
      misc: "軽症・無症状・確認中"
    },
    age: [
      "80代以上",
      "70代",
      "60代",
      "50代",
      "40代",
      "30代",
      "20代",
      "10代",
      "10歳未満",
      "不明"
    ]
  },
  en: {
    change: "Daily: ",
    total: "Total",
    transition: {
      carriers: ["With Symptoms", "No Symptom", "Checking"],
      cases: ["Active Cases"],
      discharged: ["Discharged"],
      deaths: ["MHLW Confirmed", "Difference from Preliminary by Prefectures"],
      pcrtested: ["PCR Tested"],
      serious: ["Serious"]
    },
    unit: {
      carriers: "",
      cases: "",
      discharged: "",
      pcrtested: "",
      serious: "",
      deaths: "",
      doubling: "days"
    },
    demography: {
      deaths: "Deaths",
      serious: "Serious",
      misc: "Mild, No symptom, Checking"
    },
    age: [
      "80s+",
      "70s",
      "60s",
      "50s",
      "40s",
      "30s",
      "20s",
      "10s",
      "Under 10",
      "Unknown"
    ]
  }
};



const init = () => {
  const addCommas = (num) => {
    return String(num).replace( /(\d)(?=(\d\d\d)+(?!\d))/g, '$1,');
  }

  const capitalize = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  }

  const updateThresholds = () => {
    const median = (values) => {
      let sorted = values.sort((a, b) => a - b);
      let is = [Math.floor(values.length / 2), Math.ceil(values.length / 2)];
      return (sorted[is[0]] + sorted[is[1]]) / 2;
    }

    for (thType in gThresholds) {
      let values = [];
      let rows = gData["prefectures-data"][thType];
      let latest = rows[rows.length - 1];
      for (let i = 3; i < latest.length; i++) {
        values.push(latest[i]);
      }
      gThresholds[thType] = median(values);
    }
  }

  const drawLatestValue = ($box, latestValue, latestChange) => {
    latestChange = addCommas(latestChange).toString();
        if (latestChange.charAt(0) !== "-") latestChange = "+" + latestChange;
    let $latest = $box.find(".latest");
        $latest.find(".value").text(addCommas(latestValue));
        $latest.find(".unit").text(LABELS[LANG].unit[$box.attr("code")]);
        $latest.find(".type").text(capitalize($box.find(".switch[value=total]").text()));
        $latest.find(".change").text(LABELS[LANG].change + " " + latestChange);
  }

  const drawTransitionBoxes = () => {
    // draw transition graph
    $(".transition").each(function(){
      let code = $(this).attr("code");
      drawTransitionChart($(this), code);
    });

    // draw doubling graph
    $(".doubling").each(function(){
      let code = $(this).attr("code");
      drawDoublingChart($(this), code);
    });
  }

  const drawTransitionChart = ($box, code) => {
    let $chart = $box.find(".chart").empty().html("<canvas></canvas>");
    let $canvas = $chart.find("canvas")[0];
    let switchValue = $box.find(".switch.selected").attr("value");
    let graphValue = $box.find(".graph.switch.selected").attr("value");

    let rows = gData.transition[code];
    let valueLatest = 0;
    let valuePrev   = 0;
    for (let i = 3; i < rows[0].length; i++) {
      valueLatest += rows[rows.length - 1][i];
      valuePrev   += rows[rows.length - 2][i];
    }
    drawLatestValue($box, valueLatest, valueLatest - valuePrev);

    let config = {
      type: "bar",
      data: {
        labels: [],
        datasets: []
      },
      options: {
        aspectRatio: 1.6,
        legend: {
          display: false
        },
        title: {
          display: false
        },
        tooltips: {
          xPadding: 24,
          yPadding: 12,
          displayColors: false,
          callbacks: {
            title: function(tooltipItem){
              let dateTime = tooltipItem[0].xLabel.trim() + " " + "12:00";
              if (LANG === "ja") dateTime = dateTime + "時点";
              if (LANG === "en") dateTime = "As of " + dateTime;
              let suffix = $box.find(".switch.selected").text();
              return dateTime + " " + suffix;
            },
            label: function(tooltipItem, data){
              let ret = [];
              let total = 0;
              data.datasets.forEach(function(ds, i){
                ret.push(ds.label + ": " + addCommas(ds.data[tooltipItem.index]) + " " + LABELS[LANG].unit[code]);
                total += ds.data[tooltipItem.index];
              });
              if (data.datasets.length >= 2) {
                ret.push(LABELS[LANG].total + ": " + addCommas(total) + " " + LABELS[LANG].unit[code]);
              }
              return ret;
            }
          }
        },
        scales: {
          xAxes: [{
            stacked: true,
            gridLines: {
              display: false
            },
            ticks: {
              fontColor: "rgba(255,255,255,0.7)",
              maxRotation: 0,
              minRotation: 0,
              callback: (label) => {
                return " " + label + " ";
              }
            }
          }],
          yAxes: [{
            type: "logarithmic",
            location: "bottom",
            stacked: true,
            gridLines: {
              display: true,
              zeroLineColor: "rgba(255,255,255,0.7)",
              color: "rgba(255, 255, 255, 0.3)"
            },
            ticks: {
              beginAtZero: true,
              fontColor: "rgba(255,255,255,0.7)",
              callback: function(value, index, values) {
                if (Math.floor(value) === value) {
                  return addCommas(value.toString());
                }
              }
            }
          }]
        }
      }
    };

    // set graph type
    config.options.scales.yAxes[0].type = graphValue;

    if ($box.width() >= 400) {
      config.options.aspectRatio = 2.0;
    }

    for (let i = 3; i < rows[0].length; i++) {
      config.data.datasets.push({
        label: LABELS[LANG].transition[code][i - 3],
        backgroundColor: COLORS[code][i - 3],
        data: []
      });
    }

    rows.forEach(function(row, i){
      if (switchValue === "total") {
        config.data.labels.push(row[1] + "/" + row[2]);
        for (let j = 3; j < rows[0].length; j++) {
          config.data.datasets[j - 3].data.push(row[j]);
        }
      } else if (i >= 1) {
        config.data.labels.push(row[1] + "/" + row[2]);
        let prev = rows[i - 1];
        for (let j = 3; j < rows[0].length; j++) {
          if (row[j] !== "" && prev[j] !== "") {
            config.data.datasets[j - 3].data.push(row[j] - prev[j]);
          } else {
            config.data.datasets[j - 3].data.push(0);
          }
        }
      }
    });

    let ctx = $canvas.getContext('2d');
    window.myChart = new Chart(ctx, config);
  }

  //
  // Draw Doubling Chart
  //
  const drawDoublingChart = ($box, code) => {
    let $chart = $box.find(".chart").empty().html("<canvas></canvas>");
    let $canvas = $chart.find("canvas")[0];
    let switchValue = "total";
    let graphValue = "linear";

    // "carriers":[[2020,2,17,38,8,""], [2020,2,18,44,9,""], ... (length = 6)
    // "cases"   :[[2020,2,17,33],      [2020,2,18,40],      ... (length = 4)
    // "deaths"  :[[2020,2,17,1,""],    [2020,2,18,1,""],    ... (length = 5)
    let rows = gData.transition[code];
    rows.forEach((row) => {
      row[3] += (5 <= row.length ? row[4] : 0) + (6 <= row.length ? row[5] : 0);
      console.log(code + " len: " + row.length + " val: " + row[3]);
    });

    let config = {
      type: "line",
      data: {
        labels: [],
        datasets: [{
          label: $box.find("h3:first").text(),
          fill: false,
          lineTension: 0.1,
          borderColor: COLORS.selected,
//        backgroundColor: COLORS[code],
          borderWidth: 4,
          pointRadius: 2,
          pointBorderWidth: 1,
          pointBackgroundColor: "#242a3c",
          data: []
        }]
      },
      options: {
        aspectRatio: 1.6,
        responsive: true,
        legend: {
          display: false
        },
        title: {
          display: false
        },
        tooltips: {
          xPadding: 24,
          yPadding: 12,
          displayColors: false,
          callbacks: {
            title: function(tooltipItem){
              let dateTime = tooltipItem[0].xLabel + " " + "12:00";
              if (LANG === "ja") dateTime = dateTime + "時点";
              if (LANG === "en") dateTime = "As of " + dateTime;
              //let suffix = $box.find(".switch.selected").text();
              let suffix = "";
              return dateTime + " " + suffix;
            },
            label: function(tooltipItem, data){
              let ret = data.datasets[0].label + ": " + addCommas(data.datasets[0].data[tooltipItem.index]) + " " + LABELS[LANG].unit["doubling"];
              return ret;
            }
          }
        },
        scales: {
          xAxes: [{
            stacked: false,
            gridLines: {
              display: false
            },
            ticks: {
              fontColor: "rgba(255,255,255,0.7)",
              maxRotation: 0,
              minRotation: 0,
              callback: (label) => {
                return " " + label + " ";
              }
            }
          }],
          yAxes: [{
            type: "linear",
            location: "bottom",
            stacked: false,
            gridLines: {
              display: true,
              zeroLineColor: "rgba(255,255,255,0.7)",
              color: "rgba(255, 255, 255, 0.3)"
            },
            ticks: {
              beginAtZero: true,
              fontColor: "rgba(255,255,255,0.7)",
              callback: function(value, index, values) {
                if (Math.floor(value) === value) {
                  return addCommas(value.toString());
                }
              }
            }
          }]
        }
      }
    };

    // set graph type
    config.options.scales.yAxes[0].type = graphValue;

    if ($box.width() >= 400) {
      config.options.aspectRatio = 2.0;
    }

    let latestValue = 0;
    let prevValue = 0;
    rows.forEach(function(row, i){
      config.data.labels.push(row[1] + "/" + row[2]);
      if (switchValue === "total") {
        let hc = row[3] / 2;
        let pi = i - 1;
        while (0 < pi && hc < rows[pi][3]) {
//        console.log("i:" + i + " hc:" + hc + " pi:" + pi + " pic:" + rows[pi][3]);
          pi--;
        }
        prevValue = latestValue;
        latestValue = (0 < pi || rows[0][3] <= hc) ? (i - pi) : 0;
        config.data.datasets[0].data.push(latestValue);

//      console.log(row[1] + "/" + row[2] + " doubling time:" + latestValue);
      } else if (i >= 1) {
        let prev = rows[i - 1];
        config.data.datasets[0].data.push(row[3] - prev[3]);
      }
    });

    // latest
    let $latest = $box.find(".latest");
    $latest.find(".value").text(addCommas(latestValue));
    $latest.find(".unit").text(LABELS[LANG].unit["doubling"]);

    // latest change
    let latestChange = addCommas(latestValue - prevValue).toString();
    if (latestChange.charAt(0) !== "-") latestChange = "+" + latestChange;
    $latest.find(".change").text(LABELS[LANG].change + " " + latestChange);

    let ctx = $canvas.getContext('2d');
    window.myChart = new Chart(ctx, config);
  }

  //
  // draw graphs of local govement data
  //
  const drawTransitionBoxesLocalGov = () => {
    // draw transition graph (local-gov)
    $(".transition-localgov").each(function(){
      let code = $(this).attr("code");
      drawTransitionLocalGov($(this), code);
    });

    // draw doubling graph (local-gov)
    $(".doubling-localgov").each(function(){
      let code = $(this).attr("code");
      drawDoublingLocalGov($(this), code);
    });
  }

  //
  // draw transition graph (data from local goverment)
  //
  const drawTransitionLocalGov = ($box, code) => {
    let $chart = $box.find(".chart").empty().html("<canvas></canvas>");
    let $canvas = $chart.find("canvas")[0];
    let switchValue = $box.find(".switch.selected").attr("value");
    let graphValue = $box.find(".graph.switch.selected").attr("value");

    let rows = gLocalGov.transition[code];

    let latestValue = rows[rows.length - 1][3];
    let latestChange = latestValue - rows[rows.length - 2][3];
    drawLatestValue($box, latestValue, latestChange);

    let config = {
      type: "bar",
      data: {
        labels: [],
        datasets: [{
          label: $box.find("h3:first").text(),
          backgroundColor: COLORS[code][0],
          data: []
        }]
      },
      options: {
        aspectRatio: 1.6,
        responsive: true,
        legend: {
          display: false
        },
        title: {
          display: false
        },
        tooltips: {
          xPadding: 24,
          yPadding: 12,
          displayColors: false,
          callbacks: {
            title: function(tooltipItem){
              let dateTime = tooltipItem[0].xLabel + " " + "12:00";
              if (LANG === "ja") dateTime = dateTime + "時点";
              if (LANG === "en") dateTime = "As of " + dateTime;
              let suffix = $box.find(".switch.selected").text();
              return dateTime + " " + suffix;
            },
            label: function(tooltipItem, data){
              let ret = data.datasets[0].label + ": " + addCommas(data.datasets[0].data[tooltipItem.index]) + " " + LABELS[LANG].unit[code];
              return ret;
            }
          }
        },
        scales: {
          xAxes: [{
            stacked: false,
            gridLines: {
              display: false
            },
            ticks: {
              fontColor: "rgba(255,255,255,0.7)",
              maxRotation: 0,
              minRotation: 0,
              callback: (label) => {
                return " " + label + " ";
              }
            }
          }],
          yAxes: [{
            type: "logarithmic",
            location: "bottom",
            stacked: false,
            gridLines: {
              display: true,
              zeroLineColor: "rgba(255,255,255,0.7)",
              color: "rgba(255, 255, 255, 0.3)"
            },
            ticks: {
              beginAtZero: true,
              fontColor: "rgba(255,255,255,0.7)",
              callback: function(value, index, values) {
                if (Math.floor(value) === value) {
                  return addCommas(value.toString());
                }
              }
            }
          }]
        }
      }
    };

    // set graph type
    config.options.scales.yAxes[0].type = graphValue;

    if ($box.width() >= 400) {
      config.options.aspectRatio = 2.0;
    }

    rows.forEach(function(row, i){
      if (switchValue === "total") {
        config.data.labels.push(row[1] + "/" + row[2]);
        config.data.datasets[0].data.push(row[3]);
      } else if (i >= 1) {
        config.data.labels.push(row[1] + "/" + row[2]);
        let prev = rows[i - 1];
        config.data.datasets[0].data.push(row[3] - prev[3]);
      }
    });

    let ctx = $canvas.getContext('2d');
    window.myChart = new Chart(ctx, config);
  }

  //
  // Draw Doubling Chart (data from local goverment)
  //
  const drawDoublingLocalGov = ($box, code) => {
    let $chart = $box.find(".chart").empty().html("<canvas></canvas>");
    let $canvas = $chart.find("canvas")[0];
    let switchValue = "total";
    let graphValue = "linear";

    let rows = gLocalGov.transition[code];

    let config = {
      type: "line",
      data: {
        labels: [],
        datasets: [{
          label: $box.find("h3:first").text(),
          fill: false,
          lineTension: 0.1,
          borderColor: COLORS.selected,
//        backgroundColor: COLORS[code],
          borderWidth: 4,
          pointRadius: 2,
          pointBorderWidth: 1,
          pointBackgroundColor: "#242a3c",
          data: []
        }]
      },
      options: {
        aspectRatio: 1.6,
        responsive: true,
        legend: {
          display: false
        },
        title: {
          display: false
        },
        tooltips: {
          xPadding: 24,
          yPadding: 12,
          displayColors: false,
          callbacks: {
            title: function(tooltipItem){
              let dateTime = tooltipItem[0].xLabel + " " + "12:00";
              if (LANG === "ja") dateTime = dateTime + "時点";
              if (LANG === "en") dateTime = "As of " + dateTime;
              //let suffix = $box.find(".switch.selected").text();
              let suffix = "";
              return dateTime + " " + suffix;
            },
            label: function(tooltipItem, data){
              let ret = data.datasets[0].label + ": " + addCommas(data.datasets[0].data[tooltipItem.index]) + " " + LABELS[LANG].unit["doubling"];
              return ret;
            }
          }
        },
        scales: {
          xAxes: [{
            stacked: false,
            gridLines: {
              display: false
            },
            ticks: {
              fontColor: "rgba(255,255,255,0.7)",
              maxRotation: 0,
              minRotation: 0,
              callback: (label) => {
                return " " + label + " ";
              }
            }
          }],
          yAxes: [{
            type: "linear",
            location: "bottom",
            stacked: false,
            gridLines: {
              display: true,
              zeroLineColor: "rgba(255,255,255,0.7)",
              color: "rgba(255, 255, 255, 0.3)"
            },
            ticks: {
              beginAtZero: true,
              fontColor: "rgba(255,255,255,0.7)",
              callback: function(value, index, values) {
                if (Math.floor(value) === value) {
                  return addCommas(value.toString());
                }
              }
            }
          }]
        }
      }
    };

    // set graph type
    config.options.scales.yAxes[0].type = graphValue;

    if ($box.width() >= 400) {
      config.options.aspectRatio = 2.0;
    }

    let latestValue = 0;
    let prevValue = 0;
    rows.forEach(function(row, i){
      config.data.labels.push(row[1] + "/" + row[2]);
      if (switchValue === "total") {
        let hc = row[3] / 2;
        let pi = i - 1;
        while (0 < pi && hc < rows[pi][3]) {
          pi--;
        }
        prevValue = latestValue;
        latestValue = (0 < pi || rows[0][3] <= hc) ? (i - pi) : 0;
        config.data.datasets[0].data.push(latestValue);
      } else if (i >= 1) {
        let prev = rows[i - 1];
        config.data.datasets[0].data.push(row[3] - prev[3]);
      }
    });

    // latest
    let $latest = $box.find(".latest");
    $latest.find(".value").text(addCommas(latestValue));
    $latest.find(".unit").text(LABELS[LANG].unit["doubling"]);

    // latest change
    let latestChange = addCommas(latestValue - prevValue).toString();
    if (latestChange.charAt(0) !== "-") latestChange = "+" + latestChange;
    $latest.find(".change").text(LABELS[LANG].change + " " + latestChange);

    let ctx = $canvas.getContext('2d');
    window.myChart = new Chart(ctx, config);
  }

  const getPrefColor = (prefCode) => {
    let type = $("#select-pref-type").val();
    let ret = "rgba(90, 90, 90, 0.6)";
    let value = gData["prefectures-data"][type][gData["prefectures-data"][type].length - 1][parseInt(prefCode) + 2];
    if (value >= 1) {
      ret = COLORS.dark;
      if (gThresholds[type] === 0) ret = COLORS.default;
    }
    if (value >= gThresholds[type] && gThresholds[type] >= 1) ret = COLORS.default;
    return ret;
  }

  const drawJapanMap = () => {
    $("#japan-map").empty();
    const WIDTH = $("#japan-map").width();

    let prefs = [];
    gData["prefectures-map"].forEach(function(pref, i){
      prefs.push({
        code: pref.code,
        jp: pref.ja,
        en: pref.en,
        color: getPrefColor(pref.code),
        hoverColor: COLORS.selected,
        prefectures: [pref.code]
      });
    });

    $("#japan-map").japanMap({
      areas: prefs,
      selection: "prefecture",
      width: WIDTH,
      borderLineColor: "#242a3c",
      borderLineWidth : 0.25,
      lineColor : "#ccc",
      lineWidth: 1,
      drawsBoxLine: false,
      showsPrefectureName: false,
      movesIslands : true,
      onHover: function(data){
        drawRegionChart(data.code);
        drawPrefectureCharts(data.code);
        drawPrefectureChartsLocalGov(data.code);
      }
    });
  }

  const drawDemographyChart = () => {
    $wrapper = $("#demography-chart").empty().html('<canvas></canvas>');
    $canvas = $wrapper.find("canvas")[0];

    let config = {
      type: "horizontalBar",
      data: {
        labels: [],
        datasets: [{
          label: LABELS[LANG].demography.deaths,
          backgroundColor: COLORS.deaths[0],
          borderWidth: 0.5,
          borderColor: "#242a3c",
          data: []
        },{
          label: LABELS[LANG].demography.serious,
          backgroundColor: COLORS.serious[0],
          borderWidth: 0.5,
          borderColor: "#242a3c",
          data: []
        },{
          label: LABELS[LANG].demography.misc,
          backgroundColor: COLORS.default,
          borderWidth: 0.5,
          borderColor: "#242a3c",
          data: []
        }]
      },
      options: {
        aspectRatio: 0.9,
        responsive: true,
        legend: {
          display: true,
          labels: {
            fontColor: "rgba(255, 255, 255, 0.7)"
          }
        },
        title: {
          display: false
        },
        tooltips: {
          xPadding: 24,
          yPadding: 12,
          displayColors: true,
          callbacks: {
            title: function(tooltipItem){
              let suffix = {
                ja: "名",
                en: "cases"
              };
              let age = tooltipItem[0].yLabel;
              let total = 0;
              tooltipItem.forEach(function(item, i){
                total += item.xLabel;
              });

              return age + ": " + total + " " + suffix[LANG];
            },
            label: function(tooltipItem, data){
              let suffix = {
                ja: "名",
                en: " cases"
              };
              return data.datasets[tooltipItem.datasetIndex].label + ": " + tooltipItem.value + suffix[LANG];
            }
          }
        },
        scales: {
          xAxes: [{
            stacked: true,
            position: "top",
            gridLines: {
              color: "rgba(255,255,255,0.2)"
            },
            ticks: {
              suggestedMin: 0,
              fontColor: "rgba(255,255,255,0.7)",
              callback: function(value, index, values) {
                return addCommas(value);
              }
            }
          }],
          yAxes: [{
            stacked: true,
            barPercentage: 0.8,
            gridLines: {
              color: "rgba(255,255,255,0.1)"
            },
            ticks: {
              fontColor: "rgba(255,255,255,0.7)"
            }
          }]
        }
      }
    };

    if ($wrapper.outerWidth() >= 400) config.options.aspectRatio = 1.1;
    if ($wrapper.outerWidth() >= 600) config.options.aspectRatio = 1.3;

    gData.demography.forEach(function(age, index){
      config.data.labels.push(LABELS[LANG].age[index]);
      for (let i = 0; i < 3; i++) {
        config.data.datasets[i].data.push(age[i]);
      }
    });

    let ctx = $canvas.getContext('2d');
    window.myChart = new Chart(ctx, config);
  }

  const drawRegionChart = (prefCode) => {
    let $wrapper = $("#region-chart").empty().html('<canvas></canvas>');
    let $canvas = $wrapper.find("canvas")[0];
    let dataType = $("#select-pref-type").val();

    let config = {
      type: "horizontalBar",
      data: {
        labels: [],
        datasets: [{
          label: "",
          backgroundColor: [],
          data: []
        }]
      },
      options: {
        aspectRatio: 0.4,
        animation: {
          duration: 1000
        },
        responsive: true,
        legend: {
          display: false
        },
        title: {
          display: false
        },
        tooltips: {
          xPadding: 24,
          yPadding: 12,
          displayColors: true,
          callbacks: {
            title: function(tooltipItem){
              gData["prefectures-map"].forEach(function(pref, i){
                if (pref.ja === tooltipItem[0].yLabel || pref.en === tooltipItem[0].yLabel) {
                  if ($("#select-prefecture").val() !== pref.code) {
                    drawPrefectureCharts(pref.code);
                  }
                }
              });
              return tooltipItem[0].yLabel;
            },
            label: function(tooltipItem, data){
              let suffix = {
                ja: " 名",
                en: " cases"
              };
              return tooltipItem.xLabel + suffix[LANG];
            }
          }
        },
        scales: {
          xAxes: [{
            position: "top",
            gridLines: {
              color: "rgba(255,255,255,0.2)"
            },
            ticks: {
              suggestedMin: 0,
              fontColor: "rgba(255,255,255,0.7)",
              callback: function(value, index, values) {
                return addCommas(value);
              }
            }
          }],
          yAxes: [{
            gridLines: {
              color: "rgba(255,255,255,0.1)"
            },
            ticks: {
              fontColor: "rgba(255,255,255,0.7)",
            }
          }]
        }
      }
    };

    if ($wrapper.outerWidth() >= 400) config.options.aspectRatio = 0.5;
    if (prefCode !== "") config.options.animation.duration = 0;

    let prefs = [];
    gData["prefectures-data"][dataType][gData["prefectures-data"][dataType].length - 1].forEach(function(value, i){
      if (i >= 3) {
        prefs.push({name:gData["prefectures-map"][i - 3][LANG], value:value, code:(i - 2).toString()});
      }
    });

    prefs.sort((a, b) => {
      if(a.value < b.value) return 1;
      if(a.value > b.value) return -1;
      return 0;
    });

    prefs.forEach(function(pref, i){
      config.data.labels.push(pref.name);
      config.data.datasets[0].data.push(pref.value);

      if (prefCode == pref.code) {
        config.data.datasets[0].backgroundColor.push(COLORS.selected);
      } else {
        config.data.datasets[0].backgroundColor.push(getPrefColor(pref.code));
      }
    });

    let ctx = $canvas.getContext('2d');
    window.myChart = new Chart(ctx, config);
  }

  const drawPrefectureCharts = (prefCode) => {
    $("#select-prefecture").val(prefCode);

    // draw transition charts
    $(".prefecture-chart").each(function(){
      let code = $(this).attr("code");
      drawPrefectureChart(prefCode, code);
    });

    // draw doubling charts
    $(".pref-doubling").each(function(){
      let code = $(this).attr("code");
      drawPrefDoublingChart(prefCode, code);
    });
  }

  const drawPrefectureChart = (prefCode, typeCode) => {
    let $box = $(".prefecture-chart[code=" + typeCode + "]");
    $box.find("h3").find("span").text(gData["prefectures-map"][parseInt(prefCode) - 1][LANG]);

    let $wrapper = $box.find(".chart").empty().html('<canvas></canvas>');
    let $canvas = $wrapper.find("canvas")[0];
    let switchValue = $box.find(".switch.selected").attr("value");
    let graphValue = $box.find(".graph.switch.selected").attr("value");

    let rows = gData["prefectures-data"][typeCode];
    let latestValue = rows[rows.length - 1][parseInt(prefCode) + 2];
    let latestChange = latestValue - rows[rows.length - 2][parseInt(prefCode) + 2];
    drawLatestValue($box, latestValue, latestChange);

    let config = {
      type: "line",
      data: {
        labels: [],
        datasets: []
      },
      options: {
        aspectRatio: 1.6,
        animation: false,
        responsive: true,
        legend: {
          display: false
        },
        title: {
          display: false
        },
        tooltips: {
          xPadding: 24,
          yPadding: 12,
          mode: 'x',
          displayColors: false,
          callbacks: {
            title: function(tooltipItem){
              if (tooltipItem[0].datasetIndex === 0) {
                return $box.find("h3").text();
              }
            },
            label: function(tooltipItem, data){
              if (tooltipItem.datasetIndex === 0) {
                let suffix = {
                  ja: " 名",
                  en: " cases"
                };
                return tooltipItem.xLabel.trim() + ": " + tooltipItem.yLabel + suffix[LANG];
              }
            }
          }
        },
        scales: {
          xAxes: [{
            position: "bottom",
            gridLines: {
              display: false
            },
            ticks: {
              suggestedMin: 0,
              fontColor: "rgba(255,255,255,0.7)",
              maxRotation: 0,
              minRotation: 0,
              callback: (label) => {
                return " " + label + " ";
              }
            }
          }],
          yAxes: [{
            type: "logarithmic",
            gridLines: {
              color: "rgba(255,255,255,0.2)"
            },
            ticks: {
              fontColor: "rgba(255,255,255,0.7)",
              callback: function(value, index, values) {
                if (Math.floor(value) === value) {
                  return addCommas(value.toString());
                }
              }
            }
          }]
        }
      }
    };

    // set graph type
    config.options.scales.yAxes[0].type = graphValue;

    if ($wrapper.outerWidth() >= 400) config.options.aspectRatio = 2.0;

    config.data.datasets.push({
      fill: false,
      lineTension: 0.1,
      borderColor: COLORS.selected,
      borderWidth: 3,
      pointRadius: 2,
      pointBorderWidth: 1,
      pointBackgroundColor: "#242a3c",
      data: []
    });

    for (let i = 1; i <= 46; i++) {
      config.data.datasets.push({
        fill: false,
        lineTension: 0.1,
        borderColor: "#267",
        borderWidth: 1,
        pointRadius: 0,
        data: []
      });
    }

    rows.forEach(function(row, i){
      if (switchValue === "total") {
        config.data.labels.push(row[1] + "/" + row[2]);
        config.data.datasets[0].data.push(row[parseInt(prefCode) + 2]);
        for (let j = 1; j <= 46; j++) {
          let k = (j >= parseInt(prefCode)) ? j + 1: j;
          config.data.datasets[j].data.push(row[k + 2]);
        }
      } else {
        if (i >= 1) {
          config.data.labels.push(row[1] + "/" + row[2]);

          let prev = rows[i - 1][parseInt(prefCode) + 2];
          config.data.datasets[0].data.push(row[parseInt(prefCode) + 2] - prev);

          for (let j = 1; j <= 46; j++) {
            let k = (j >= parseInt(prefCode)) ? j + 1: j;
            let prev = rows[i - 1][k + 2];
            config.data.datasets[j].data.push(row[k + 2] - prev);
          }
        }
      }
    });

    let ctx = $canvas.getContext('2d');
    window.myChart = new Chart(ctx, config);
  }

  const drawPrefDoublingChart = (prefCode, typeCode) => {
    let $box = $(".pref-doubling[code=" + typeCode + "]");
    $box.find("h3").find("span").text(gData["prefectures-map"][parseInt(prefCode) - 1][LANG]);

    let $wrapper = $box.find(".chart").empty().html('<canvas></canvas>');
    let $canvas = $wrapper.find("canvas")[0];

    let rows = gData["prefectures-data"][typeCode];

    let config = {
      type: "line",
      data: {
        labels: [],
        datasets: []
      },
      options: {
        aspectRatio: 1.6,
        animation: false,
        responsive: true,
        legend: {
          display: false
        },
        title: {
          display: false
        },
        tooltips: {
          xPadding: 24,
          yPadding: 12,
          mode: 'x',
          displayColors: false,
          callbacks: {
            title: function(tooltipItem){
              if (tooltipItem[0].datasetIndex === 0) {
                return $box.find("h3").text();
              }
            },
            label: function(tooltipItem, data){
              if (tooltipItem.datasetIndex === 0) {
                let suffix = {
                  ja: " 日",
                  en: " days"
                };
                return tooltipItem.xLabel + " " + tooltipItem.yLabel + suffix[LANG];
              }
            }
          }
        },
        scales: {
          xAxes: [{
            position: "bottom",
            gridLines: {
              display: false
            },
            ticks: {
              suggestedMin: 0,
              fontColor: "rgba(255,255,255,0.7)",
              maxRotation: 0,
              minRotation: 0,
              callback: (label) => {
                return " " + label + " ";
              }
            }
          }],
          yAxes: [{
            type: "linear",
            gridLines: {
              color: "rgba(255,255,255,0.2)"
            },
            ticks: {
              fontColor: "rgba(255,255,255,0.7)",
              callback: function(value, index, values) {
                if (Math.floor(value) === value) {
                  return addCommas(value.toString());
                }
              }
            }
          }]
        }
      }
    };

    if ($wrapper.outerWidth() >= 400) config.options.aspectRatio = 2.0;

    config.data.datasets.push({
      fill: false,
      lineTension: 0.1,
      borderColor: COLORS.selected,
      borderWidth: 4,
      pointRadius: 2,
      pointBorderWidth: 1,
      pointBackgroundColor: "#242a3c",
      data: []
    });

    for (let i = 1; i <= 46; i++) {
      config.data.datasets.push({
        fill: false,
        lineTension: 0.1,
        borderColor: "#267",
        borderWidth: 1,
        pointRadius: 0,
        data: []
      });
    }

    let latestValue = 0;
    let prevValue = 0;
    rows.forEach(function(row, i){
      config.data.labels.push(row[1] + "/" + row[2]);

      // calc
      let j = 1;
      for (let p = 1; p <= 47; ++p) {
        let hc = row[p + 2] / 2;
        let pi = i - 1;
        while (0 < pi && hc < rows[pi][p + 2]) {
          pi--;
        }

        // selected prefecture
        if (p == parseInt(prefCode)) {
          prevValue = latestValue;
          latestValue = (0 < hc && (0 < pi || rows[0][p + 2] <= hc)) ? (i - pi) : 0;
          config.data.datasets[0].data.push(latestValue);
        }

        // other prefectures
        else {
          let v = (0 < hc && (0 < pi || rows[0][p + 2] <= hc)) ? (i - pi) : 0;
          config.data.datasets[j].data.push(v);
          ++j;
        }
      }

    });

    // latest
    let $latest = $box.find(".latest");
    $latest.find(".value").text(addCommas(latestValue));
    $latest.find(".unit").text(LABELS[LANG].unit["doubling"]);

    // latest change
    let latestChange = addCommas(latestValue - prevValue).toString();
    if (latestChange.charAt(0) !== "-") latestChange = "+" + latestChange;
    $latest.find(".change").text(LABELS[LANG].change + " " + latestChange);

    let ctx = $canvas.getContext('2d');
    window.myChart = new Chart(ctx, config);
  }

  // draw charts of local goverments
  const drawPrefectureChartsLocalGov = (prefCode) => {
    $("#select-prefecture").val(prefCode);

    // draw trangision charts (data from local goverments)
    $(".prefecture-localgov").each(function(){
      let code = $(this).attr("code");
      drawPrefectureLocalGov(prefCode, code);
    });

    // draw doubling charts (data from local goverments)
    $(".pref-doubling-localgov").each(function(){
      let code = $(this).attr("code");
      drawPrefDoublingLocalGov(prefCode, code);
    });
  }

  // Prefecture Transition chart (data from each local goverment)
  const drawPrefectureLocalGov = (prefCode, typeCode) => {
    let $box = $(".prefecture-localgov[code=" + typeCode + "]");
    $box.find("h3").find("span").text(gData["prefectures-map"][parseInt(prefCode) - 1][LANG]);

    let $wrapper = $box.find(".chart").empty().html('<canvas></canvas>');
    let $canvas = $wrapper.find("canvas")[0];
    let switchValue = $box.find(".switch.selected").attr("value");
    let graphValue = $box.find(".graph.switch.selected").attr("value");

    let rows = gLocalGov["prefectures-data"][typeCode];

    let latestValue = rows[rows.length - 1][parseInt(prefCode) + 2];
    let latestChange = latestValue - rows[rows.length - 2][parseInt(prefCode) + 2];
    drawLatestValue($box, latestValue, latestChange);

    let config = {
      type: "line",
      data: {
        labels: [],
        datasets: []
      },
      options: {
        aspectRatio: 1.6,
        animation: false,
        responsive: true,
        legend: {
          display: false
        },
        title: {
          display: false
        },
        tooltips: {
          xPadding: 24,
          yPadding: 12,
          mode: 'x',
          displayColors: false,
          callbacks: {
            title: function(tooltipItem){
              if (tooltipItem[0].datasetIndex === 0) {
                return $box.find("h3").text();
              }
            },
            label: function(tooltipItem, data){
              if (tooltipItem.datasetIndex === 0) {
                let suffix = {
                  ja: " 名",
                  en: " cases"
                };
                return tooltipItem.xLabel.trim() + ": " + tooltipItem.yLabel + suffix[LANG];
              }
            }
          }
        },
        scales: {
          xAxes: [{
            position: "bottom",
            gridLines: {
              display: false
            },
            ticks: {
              suggestedMin: 0,
              fontColor: "rgba(255,255,255,0.7)",
              maxRotation: 0,
              minRotation: 0,
              callback: (label) => {
                return " " + label + " ";
              }
            }
          }],
          yAxes: [{
            type: "logarithmic",
            gridLines: {
              color: "rgba(255,255,255,0.2)"
            },
            ticks: {
              fontColor: "rgba(255,255,255,0.7)",
              callback: function(value, index, values) {
                if (Math.floor(value) === value) {
                  return addCommas(value.toString());
                }
              }
            }
          }]
        }
      }
    };

    // set graph type
    config.options.scales.yAxes[0].type = graphValue;

    if ($wrapper.outerWidth() >= 400) config.options.aspectRatio = 2.0;

    config.data.datasets.push({
      fill: false,
      lineTension: 0.1,
      borderColor: COLORS.selected,
      borderWidth: 3,
      pointRadius: 2,
      pointBorderWidth: 1,
      pointBackgroundColor: "#242a3c",
      data: []
    });

    for (let i = 1; i <= 46; i++) {
      config.data.datasets.push({
        fill: false,
        lineTension: 0.1,
        borderColor: "#267",
        borderWidth: 1,
        pointRadius: 0,
        data: []
      });
    }

    rows.forEach(function(row, i){
      if (switchValue === "total") {
        config.data.labels.push(row[1] + "/" + row[2]);
        config.data.datasets[0].data.push(row[parseInt(prefCode) + 2]);
        for (let j = 1; j <= 46; j++) {
          let k = (j >= parseInt(prefCode)) ? j + 1: j;
          config.data.datasets[j].data.push(row[k + 2]);
        }
      } else {
        if (i >= 1) {
          config.data.labels.push(row[1] + "/" + row[2]);

          let prev = rows[i - 1][parseInt(prefCode) + 2];
          config.data.datasets[0].data.push(row[parseInt(prefCode) + 2] - prev);

          for (let j = 1; j <= 46; j++) {
            let k = (j >= parseInt(prefCode)) ? j + 1: j;
            let prev = rows[i - 1][k + 2];
            config.data.datasets[j].data.push(row[k + 2] - prev);
          }
        }
      }
    });

    let ctx = $canvas.getContext('2d');
    window.myChart = new Chart(ctx, config);
  }

  // draw doubling graph (data from local goverments)
  const drawPrefDoublingLocalGov = (prefCode, typeCode) => {
    let $box = $(".pref-doubling-localgov[code=" + typeCode + "]");
    $box.find("h3").find("span").text(gData["prefectures-map"][parseInt(prefCode) - 1][LANG]);

    let $wrapper = $box.find(".chart").empty().html('<canvas></canvas>');
    let $canvas = $wrapper.find("canvas")[0];

    let rows = gLocalGov["prefectures-data"][typeCode];

    let config = {
      type: "line",
      data: {
        labels: [],
        datasets: []
      },
      options: {
        aspectRatio: 1.6,
        animation: false,
        responsive: true,
        legend: {
          display: false
        },
        title: {
          display: false
        },
        tooltips: {
          xPadding: 24,
          yPadding: 12,
          mode: 'x',
          displayColors: false,
          callbacks: {
            title: function(tooltipItem){
              if (tooltipItem[0].datasetIndex === 0) {
                return $box.find("h3").text();
              }
            },
            label: function(tooltipItem, data){
              if (tooltipItem.datasetIndex === 0) {
                let suffix = {
                  ja: " 日",
                  en: " days"
                };
                return tooltipItem.xLabel + " " + tooltipItem.yLabel + suffix[LANG];
              }
            }
          }
        },
        scales: {
          xAxes: [{
            position: "bottom",
            gridLines: {
              display: false
            },
            ticks: {
              suggestedMin: 0,
              fontColor: "rgba(255,255,255,0.7)",
              maxRotation: 0,
              minRotation: 0,
              callback: (label) => {
                return " " + label + " ";
              }
            }
          }],
          yAxes: [{
            type: "linear",
            gridLines: {
              color: "rgba(255,255,255,0.2)"
            },
            ticks: {
              fontColor: "rgba(255,255,255,0.7)",
              callback: function(value, index, values) {
                if (Math.floor(value) === value) {
                  return addCommas(value.toString());
                }
              }
            }
          }]
        }
      }
    };

    if ($wrapper.outerWidth() >= 400) config.options.aspectRatio = 2.0;

    config.data.datasets.push({
      fill: false,
      lineTension: 0.1,
      borderColor: COLORS.selected,
      borderWidth: 4,
      pointRadius: 2,
      pointBorderWidth: 1,
      pointBackgroundColor: "#242a3c",
      data: []
    });

    for (let i = 1; i <= 46; i++) {
      config.data.datasets.push({
        fill: false,
        lineTension: 0.1,
        borderColor: "#267",
        borderWidth: 1,
        pointRadius: 0,
        data: []
      });
    }

    let latestValue = 0;
    let prevValue = 0;
    rows.forEach(function(row, i){
      config.data.labels.push(row[1] + "/" + row[2]);

      // calc
      let j = 1;
      for (let p = 1; p <= 47; ++p) {
        let hc = row[p + 2] / 2;
        let pi = i - 1;
        while (0 < pi && hc < rows[pi][p + 2]) {
          pi--;
        }

        // selected prefecture
        if (p == parseInt(prefCode)) {
          prevValue = latestValue;
          latestValue = (0 < hc && (0 < pi || rows[0][p + 2] <= hc)) ? (i - pi) : 0;
          config.data.datasets[0].data.push(latestValue);
        }

        // other prefectures
        else {
          let v = (0 < hc && (0 < pi || rows[0][p + 2] <= hc)) ? (i - pi) : 0;
          config.data.datasets[j].data.push(v);
          ++j;
        }
      }

    });

    // latest
    let $latest = $box.find(".latest");
    $latest.find(".value").text(addCommas(latestValue));
    $latest.find(".unit").text(LABELS[LANG].unit["doubling"]);

    // latest change
    let latestChange = addCommas(latestValue - prevValue).toString();
    if (latestChange.charAt(0) !== "-") latestChange = "+" + latestChange;
    $latest.find(".change").text(LABELS[LANG].change + " " + latestChange);

    let ctx = $canvas.getContext('2d');
    window.myChart = new Chart(ctx, config);
  }

  const showUpdateDates = () => {
    ["last", "transition", "demography", "prefectures"].forEach(function(cls){
      $(".updated-" + cls).text(gData.updated[cls][LANG]);
    });
  }

  const loadData = () => {
    //$.getJSON("https://raw.githubusercontent.com/kaz-ogiwara/covid19/master/data/data.json", function(data){
    $.getJSON("data/data.json", function(data){
      gData = data;
      try {
        updateThresholds();
        drawTransitionBoxes();
        drawDemographyChart();
        drawJapanMap();
        drawRegionChart("");
        drawPrefectureCharts("13");
        showUpdateDates();
        $("#cover-block").fadeOut();
        $("#container").addClass("show");

        // load and draw chart of local goverments
        loadDataLocalGov();
      } catch (err) {
        alert("error");
      }
    })
  }

  const bindEvents = () => {
    $(".transition").find(".switch").on("click",function(){
      let $box = $(this).closest(".transition");
      $(this).siblings(".switch").removeClass("selected");
      $(this).addClass("selected");
      drawTransitionChart($box, $box.attr("code"));
    });

    $(".transition-localgov").find(".switch").on("click",function(){
      let $box = $(this).closest(".transition-localgov");
      $(this).siblings(".switch").removeClass("selected");
      $(this).addClass("selected");
      drawTransitionLocalGov($box, $box.attr("code"));
    });

    $(".prefecture-chart").find(".switch").on("click",function(){
      let $box = $(this).closest(".prefecture-chart");
      $(this).siblings(".switch").removeClass("selected");
      $(this).addClass("selected");
      drawPrefectureChart($("#select-prefecture").val(), $box.attr("code"));
    });

    $(".prefecture-localgov").find(".switch").on("click",function(){
      let $box = $(this).closest(".prefecture-localgov");
      $(this).siblings(".switch").removeClass("selected");
      $(this).addClass("selected");
      drawPrefectureLocalGov($("#select-prefecture").val(), $box.attr("code"));
    });

    $("#select-prefecture").on("change", function(){
      let prefCode = $(this).val();
      drawPrefectureCharts(prefCode);
      drawPrefectureChartsLocalGov(prefCode);
    });

    $("#select-pref-type").on("change", function(){
      drawJapanMap();
      drawRegionChart("");
    });

    $(".more").on("click",function(){
      $(this).closest("p.notes").addClass("show");
    });

    $('a[href^="#"]').click(function() {
      let href = $(this).attr("href");
      let position = $(href).offset().top;
      $('body,html').animate({scrollTop: position}, 400, 'swing');
      return false;
    });
  }

  // load the number of death by reported local goverment
  const loadDataLocalGov = () => {
    $.get("https://raw.githubusercontent.com/swsoyee/2019-ncov-japan/master/50_Data/death.csv",
      (csv) => {
        let sum   = Array(50).fill(0);
        let table = csv.split("\n").slice(1).map((row) => row.split(','));
        table.forEach((row, i) => {
          let death_of_day = [];
          death_of_day.push(row[0].substring(0, 4) - 0); // Year
          death_of_day.push(row[0].substring(4, 6) - 0); // Mon
          death_of_day.push(row[0].substring(6) - 0); // Day
          row.slice(1, 48).forEach((data, j) => {
            sum[j] += (data - 0);
            death_of_day.push(sum[j]);
          });
          // Feb-12 or later
          if (2 < death_of_day[1] || (2 == death_of_day[1] && 12 <= death_of_day[2])) {
            gLocalGov["prefectures-data"].deaths.push(death_of_day);
            gLocalGov.transition.deaths.push(death_of_day.slice(0, 3).concat(death_of_day.slice(3).reduce((a, x) => { return a + x })));
            console.log("total death: " + death_of_day.slice(0, 3).concat(death_of_day.slice(3).reduce((a, x) => { return a + x })));
          }
        });

        // draw chars of local goverments
        drawTransitionBoxesLocalGov();
        drawPrefectureChartsLocalGov("13");
      }
    );
  }

  loadData();
  bindEvents();

};


$(function(){
  init();
});
