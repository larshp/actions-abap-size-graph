const childProcess = require("child_process");
const process = require("process");
const fs = require("fs");
const puppeteer = require('puppeteer');

function countLines(extension, workdir) {
  const buffer = childProcess.execSync("find -name '*." + extension + "' | xargs cat | wc -l", {cwd: workdir});
  return parseInt(buffer.toString().trim());
}

function buildData() {

  const workdir = process.cwd() + "/../json.abap/";
  const out = childProcess.execSync("git --no-pager log --pretty=format:\"%H %cd\"", {cwd: workdir});
  const commits = out.toString().split("\n");

  const result = [];

  let count = 1;
  for (const commit of commits) {
    if (count % 10 === 0) {
      console.log(count + "/" + commits.length);
    }
    count++;

    childProcess.execSync("git checkout " + commit.substr(0, 40) + " --quiet", {cwd: workdir, stdio: "inherit"});

    result.push({
      commit: commit.substr(0, 40),
      date: new Date(commit.substr(41)).toJSON(),
      abap_lines: countLines("abap", workdir),
      xml_lines: countLines("xml", workdir)});

    try {
      childProcess.execSync("git checkout - --quiet", {cwd: workdir, stdio: "inherit"});
    } catch (e) {
// strange error, just break
      break;
    }

  }

  return result;
}

function buildHtml(data) {
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,maximum-scale=1.0">
<title>Graph</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.13.0/moment.min.js" integrity="sha256-TkEcmf5KSG2zToAaUzkq6G+GWezMQ4lEtaBiyaq6Jb4=" crossorigin="anonymous"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.8.0/Chart.min.js" integrity="sha256-Uv9BNBucvCPipKQ2NS9wYpJmi8DTOEfTA/nH2aoJALw=" crossorigin="anonymous"></script>
<style type="text/css">
body {font-family: sans-serif;}
</style>
</head>
<body>
<h1>ABAP lines over time</h1>

<canvas id="abap_length_canvas"></canvas>
<script>
let raw = ` + JSON.stringify(data, null, 1) + `;

    var timeFormat = 'MM/DD/YYYY HH:mm';

    let points = [];
    let labels = [];
    let previous = undefined;
    for (let i = 0; i < raw.length ; i++) {
      if (previous !== raw[i].abap_lines) {
        labels.push(moment(raw[i].date).toDate());
        points.push(raw[i].abap_lines);
      }

      previous = raw[i].abap_lines;
    }

    var data = {
      datasets: [{
        data: points,
        backgroundColor: "#ccc",
        borderColor: "#ccc",
        label: "Lines",
        steppedLine: true,
        fill: false
      }],
      labels: labels};

    var ctx = document.getElementById("abap_length_canvas").getContext('2d');

    var myChart = new Chart(ctx, {
      type: 'line',
      data,
      options: {
        animation: false,
        tooltips: {
            mode: 'nearest',
            intersect: false
        },
        scales: {
        xAxes: [{
						type: 'time',
						time: {
							parser: timeFormat,
							tooltipFormat: 'll HH:mm'
						},
						scaleLabel: {
							display: true,
							labelString: 'Date'
						}
					}] },
        legend: {display: false}}
    });

</script>
</body>
</html>`;
  return html;
}

// -------------------------

const html = buildHtml(buildData());

fs.writeFileSync("index.html", html);

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({width: 900, height: 1440, deviceScaleFactor: 2});
  await page.setContent(html);
  await page.pdf({path: 'output.pdf',
    margin: { left: '1cm', top: '2cm', right: '1cm', bottom: '1cm' },
    format: "A4"});

  await browser.close();
})();