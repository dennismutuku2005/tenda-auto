import http from 'node:http';

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tenda Wireless Router - Quickset</title>
  <style>
    body { font-family: sans-serif; background: #f4f6f9; margin: 40px; }
    .none { display: none !important; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; padding: 25px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .form-group { margin-bottom: 15px; display: flex; align-items: center; }
    .form-group label { width: 140px; font-weight: bold; }
    .form-control { padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px; flex: 1; }
    .save-btn { background: #ff6a00; color: #fff; border: none; padding: 10px 24px; font-size: 16px; border-radius: 4px; cursor: pointer; width: 100%; }
    .save-btn:hover { background: #e55e00; }
    #quicksetDoneWrap { text-align: center; padding: 30px; }
    #status { font-size: 48px; color: #28a745; margin-bottom: 10px; }
  </style>
</head>
<body>
  <div id="main_content">
    <section class="container container-fluid">
      <header class="logo-wrap">
        <div class="logo-text"><strong>Tenda Router:</strong> You can enjoy the Internet after completing the settings on this page.</div>
      </header>
      <hr>
      <article class="quickSet" id="quickSetWrap">
        <form class="form-horizontal">
          <div class="quickContent text-center">
            <div class="net-status" style="border-bottom:1px solid #eee; padding-bottom:12px; margin-bottom:10px;">
              <span class="text-danger" style="color:red;">Tips: WAN port unplugged! Please plug the Internet cable into it.</span>
            </div>
            
            <h3>Internet Settings</h3>
            <div class="form-group">
              <label>Connection Type</label>
              <div>
                <label for="adsl"><input type="radio" id="adsl" name="wanType" value="pppoe"> PPPoE</label>&nbsp;&nbsp;
                <label for="dhcp"><input type="radio" id="dhcp" name="wanType" value="dhcp"> Dynamic IP</label>&nbsp;&nbsp;
                <label for="static"><input type="radio" id="static" name="wanType" value="static"> Static IP</label>
              </div>
            </div>

            <section id="quickSetDHCPWrap" class="">
              <p style="color:#666; font-size:13px;">Select Dynamic IP if your Internet can be auto-connected with no account or static IP info set.</p>
            </section>

            <hr>
            <h3>Wireless Settings</h3>
            <div class="form-group">
              <label for="wifiSSID">WiFi Name</label>
              <input type="text" name="wifiSSID" id="wifiSSID" class="form-control" placeholder="WiFi Name" value="Tenda_Default">
            </div>

            <div class="form-group">
              <label for="wifiPwd">WiFi Password</label>
              <input type="password" name="wifiPwd" id="wifiPwd" class="form-control" placeholder="WiFi Password">
            </div>
          </div>
        </form>

        <footer class="quickset-footer" style="margin-top:20px;">
          <input class="form-control save-btn" type="button" id="save" value="OK">
        </footer>
      </article>

      <article class="quickSet none" id="quicksetDoneWrap">
        <div id="savedWrap">
          <div id="status">[OK]</div>
          <h2>Saved!</h2>
          <div id="wirelessSuccess">
            <span>The wireless connection has been disconnected. Please connect to WiFi name:</span>
            <div class="text-warn" id="newSSID" style="font-weight:bold; color:#ff6a00; font-size:18px;"></div>
          </div>
        </div>
      </article>
    </section>
  </div>

  <script>
    document.getElementById('save').addEventListener('click', function() {
      var ssid = document.getElementById('wifiSSID').value;
      document.getElementById('quickSetWrap').classList.add('none');
      document.getElementById('quicksetDoneWrap').classList.remove('none');
      document.getElementById('newSSID').innerText = ssid;
      console.log('Saved with SSID:', ssid);
    });
  </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  console.log(`[Mock Router] ${req.method} ${req.url}`);
  if (req.url === '/quickset.html' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(htmlContent);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

const PORT = 8089;
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Mock Tenda Router running at http://127.0.0.1:${PORT}/quickset.html`);
});
