import http from 'node:http';

const quicksetContent = `<!DOCTYPE html>
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
            <span>The wireless connection has been disconnected. Redirecting to management...</span>
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
      setTimeout(function() {
        window.location.href = '/index.html';
      }, 1200);
    });
  </script>
</body>
</html>`;

const indexContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tenda Router Management</title>
  <style>
    body { font-family: sans-serif; background: #eef2f5; margin: 0; padding: 20px; }
    .none { display: none !important; }
    .container { max-width: 700px; margin: 40px auto; background: #fff; border-radius: 8px; padding: 30px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
    h2 { border-bottom: 2px solid #ff6a00; padding-bottom: 10px; color: #333; }
    .form-group { margin-bottom: 18px; display: flex; align-items: center; }
    .form-group label { width: 200px; font-weight: bold; color: #444; }
    .form-control { padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px; flex: 1; }
    .btn { padding: 8px 20px; border-radius: 4px; cursor: pointer; border: 1px solid #ccc; background: #f0f0f0; }
    .btn-primary { background: #ff6a00; color: #fff; border-color: #e55e00; }
    .btn-primary:hover { background: #e55e00; }

    /* Note Modal styles */
    .md-modal-wrap { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .md-modal { background: #fff; border-radius: 6px; box-shadow: 0 6px 20px rgba(0,0,0,0.25); min-width: 420px; overflow: hidden; }
    .md-header { background: #f7f7f7; margin: 0; padding: 12px 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; }
    .md-close { background: none; border: none; font-size: 20px; cursor: pointer; float: right; }
    .dialog-container { padding: 24px 30px; }
    .dialog-msg { font-size: 14px; color: #555; margin-bottom: 20px; line-height: 1.5; }
    .btn-group { display: flex; gap: 12px; justify-content: center; }
  </style>
</head>
<body>

  <!-- Note Modal from Tenda Router -->
  <div class="md-modal-wrap" id="modalWrap">
    <div class="md-modal">
      <div class="md-content">
        <h3 class="md-header">Note <button class="md-close" onclick="closeModal()">×</button></h3>
        <div class="md-con-body">
          <section id="setPassWord" class="none" style="display: block;">
            <div class="dialog-container">
              <div class="dialog-msg">The current router has not set a login password, it is recommended to go to the settings!</div>
              <div class="btn-group">
                <input type="button" value="Go to set" class="btn btn-primary" id="goSet">
                <input type="button" value="Cancel" class="btn" id="cancelSet">
              </div>
            </div>
          </section>
        </div>
        <div class="md-toolbar"></div>
      </div>
    </div>
  </div>

  <!-- Administration Settings Page -->
  <div class="container" id="adminContainer" style="display: none;">
    <h2>Administration Settings</h2>

    <form id="adminForm">
      <h3>Login Password</h3>
      <div class="form-group">
        <label for="newPwd">New Password</label>
        <input type="password" id="newPwd" name="newPwd" class="form-control" placeholder="New Password">
      </div>
      <div class="form-group">
        <label for="confirmPwd">Confirm Password</label>
        <input type="password" id="confirmPwd" name="confirmPwd" class="form-control" placeholder="Confirm Password">
      </div>

      <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;">

      <h3>LAN Settings</h3>
      <div class="form-group">
        <label for="lanIP">LAN IP</label>
        <input type="text" id="lanIP" name="lanIP" class="form-control" value="192.168.0.1">
      </div>

      <div class="form-group">
        <label for="dhcpEn">DHCP Server</label>
        <div>
          <label style="font-weight: normal; width: auto;"><input type="checkbox" id="dhcpEn" name="dhcpEn" checked> Enable</label>
        </div>
      </div>

      <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;">

      <h3>Maintenance</h3>
      <div class="form-group">
        <label for="autoRebootEn">Sys Auto Maintenance</label>
        <div>
          <label style="font-weight: normal; width: auto;"><input type="checkbox" id="autoRebootEn" name="autoRebootEn" checked> Enable</label>
        </div>
      </div>

      <div style="margin-top: 30px; text-align: center;">
        <input type="button" id="save" class="btn btn-primary" value="OK" style="width: 200px; padding: 12px;">
      </div>
    </form>

    <div id="rebootSuccess" class="none" style="text-align: center; padding: 40px;">
      <h2 style="color: #28a745; border: none;">[OK] Settings Saved! Router is rebooting...</h2>
      <p id="newLanNotice" style="font-size: 16px; color: #555;"></p>
    </div>
  </div>

  <script>
    function closeModal() {
      document.getElementById('modalWrap').style.display = 'none';
      document.getElementById('adminContainer').style.display = 'block';
    }

    document.getElementById('goSet').addEventListener('click', function() {
      closeModal();
    });

    document.getElementById('cancelSet').addEventListener('click', function() {
      closeModal();
    });

    document.getElementById('save').addEventListener('click', function() {
      var newIp = document.getElementById('lanIP').value;
      var pass = document.getElementById('newPwd').value;
      var dhcp = document.getElementById('dhcpEn').checked;
      var autoReboot = document.getElementById('autoRebootEn').checked;

      console.log('Saved settings:', { newIp: newIp, pass: pass, dhcp: dhcp, autoReboot: autoReboot });

      document.getElementById('adminForm').style.display = 'none';
      document.getElementById('rebootSuccess').classList.remove('none');
      document.getElementById('newLanNotice').innerText = 'New LAN IP: ' + newIp + ' | DHCP: ' + (dhcp ? 'ON' : 'OFF') + ' | Auto Maint: ' + (autoReboot ? 'ON' : 'OFF');

      // Show login form after brief delay
      setTimeout(function() {
        document.getElementById('rebootSuccess').innerHTML = '<h2>Router Login</h2><div style="margin: 20px 0;"><input type="password" id="loginPassword" class="form-control" placeholder="Please enter login password" style="width: 250px; margin: 0 auto; display: block;"></div><button id="login-btn" class="btn btn-primary">Login</button>';
      }, 1500);
    });
  </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  console.log(`[Mock Router] ${req.method} ${req.url}`);
  if (req.url === '/quickset.html' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(quicksetContent);
  } else if (req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(indexContent);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

const PORT = 8089;
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Mock Tenda Router running at http://127.0.0.1:${PORT}/quickset.html`);
});
