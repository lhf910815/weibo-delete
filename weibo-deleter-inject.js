(function() {
  window._delRun = true;

  var saved = { total: 0, browse: 0, errors: 0 };
  try { saved = JSON.parse(window.name || '{}'); } catch(e) {}

  window._delTotal = saved.total || 0;
  window._delCount = 0;
  window._delErrors = 0;
  window._browseCount = saved.browse || 0;
  window._browseAfter = 20 + Math.floor(Math.random() * 11);

  function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
  function randChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function persist() {
    try {
      window.name = JSON.stringify({
        total: window._delTotal,
        browse: window._browseCount,
        errors: window._delErrors
      });
    } catch(e) {}
  }

  // ====== 浏览行为：纯 setTimeout 链，不卡主线程 ======
  function browseInPage(cb) {
    var mode = randChoice(['scroll_down', 'scroll_mid', 'read_like', 'scroll_up']);

    if (mode === 'scroll_down') {
      var i = 0;
      (function nextScroll() {
        if (!window._delRun || i >= randInt(4, 8)) {
          window.scrollTo(0, 0);
          cb();
          return;
        }
        window.scrollBy(0, randInt(150, 350));
        i++;
        setTimeout(nextScroll, randInt(1000, 2000));
      })();

    } else if (mode === 'scroll_mid') {
      var h = Math.max(document.body.scrollHeight - 800, 400);
      window.scrollTo(0, randInt(200, h));
      setTimeout(function() {
        window.scrollTo(0, 0);
        cb();
      }, randInt(5000, 8000));

    } else if (mode === 'read_like') {
      var arts = document.querySelectorAll('article');
      if (arts.length > 0) {
        var art = randChoice(Array.from(arts));
        art.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(function() {
          var likeBtn = art.querySelector('[node-type="like"]') ||
                        art.querySelector('[action-type="ok"]') ||
                        art.querySelector('[title="赞"]');
          if (likeBtn && Math.random() > 0.4) {
            try { likeBtn.click(); } catch(e) {}
          }
          window.scrollTo(0, 0);
          cb();
        }, randInt(3000, 6000));
      } else {
        cb();
      }

    } else {
      // scroll up a bit then down
      window.scrollBy(0, -randInt(200, 500));
      setTimeout(function() {
        window.scrollBy(0, randInt(200, 500));
        setTimeout(function() {
          window.scrollTo(0, 0);
          cb();
        }, randInt(2000, 4000));
      }, randInt(2000, 4000));
    }
  }

  // ====== 删除一条 ======
  function deleteOne(cb) {
    try {
      var arts = document.querySelectorAll('article');
      if (!arts || arts.length === 0) { cb(false); return; }

      var idx = randInt(0, Math.min(arts.length - 1, 4));
      var art = arts[idx];
      var more = art.querySelector('[title="更多"]');
      if (!more) { cb(false); return; }

      more.click();
      setTimeout(function() {
        var del = Array.from(document.querySelectorAll('*')).find(function(e) {
          return (e.textContent || '').trim() === '删除' && e.offsetParent !== null;
        });
        if (!del) { document.body.click(); cb(false); return; }

        del.click();
        setTimeout(function() {
          var okBtn = Array.from(document.querySelectorAll('button')).find(function(b) {
            return (b.textContent || '').trim() === '确定' && b.offsetParent !== null;
          });
          if (!okBtn) { document.body.click(); cb(false); return; }

          okBtn.click();
          setTimeout(function() { cb(true); }, randInt(600, 1000));
        }, randInt(400, 700));
      }, randInt(400, 700));
    } catch(e) { cb(false); }
  }

  // ====== 主循环 ======
  var lastReport = 0;
  var consecutiveFail = 0;

  function loop() {
    if (!window._delRun) {
      console.log('[Stop] Script stopped. Total:' + window._delTotal + ' browse:' + window._browseCount + ' errors:' + window._delErrors);
      return;
    }

    // 每 20-30 条触发一次浏览
    if (window._delCount > 0 && window._delCount - lastReport >= window._browseAfter) {
      console.log('[Browse] Triggered after ' + window._delCount + ' deletes, simulating human browse...');
      browseInPage(function() {
        window._browseCount++;
        persist();
        lastReport = window._delCount;
        window._browseAfter = 20 + randInt(0, 11);
        console.log('[Browse] Done. Total browse:' + window._browseCount + '. Resuming delete...');
        setTimeout(loop, randInt(500, 1000));
      });
      return;
    }

    deleteOne(function(success) {
      if (success) {
        window._delCount++;
        window._delTotal++;
        persist();
        consecutiveFail = 0;
        if (window._delCount % 10 === 0) {
          console.log('[Report] Total:' + window._delTotal + ' this_run:' + window._delCount + ' browse:' + window._browseCount + ' errors:' + window._delErrors);
        }
      } else {
        window._delErrors++;
        persist();
        consecutiveFail++;
        if (consecutiveFail >= 5) {
          console.log('[Retry] ' + consecutiveFail + ' consecutive fails, scrolling...');
          window.scrollBy(0, randInt(300, 600));
          consecutiveFail = 0;
        }
        if (window._delErrors >= 50) {
          console.log('[Stop] Too many errors: ' + window._delErrors);
          window._delRun = false;
          return;
        }
      }
      setTimeout(loop, randInt(800, 1500));
    });
  }

  window._stopDel = function() { window._delRun = false; };
  window._statusDel = function() {
    return {
      total: window._delTotal,
      count: window._delCount,
      errors: window._delErrors,
      browse: window._browseCount,
      running: window._delRun
    };
  };

  console.log('Weibo Deleter started! Total:' + window._delTotal + ' browse:' + window._browseCount);
  console.log('Strategy: 20-30 deletes then human browse. _stopDel() to stop.');
  setTimeout(loop, 1000);
})();
