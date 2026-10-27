package za.leer.afrikaansleer;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/** Wraps the exact same web app (assets/index.html) in a WebView. No changes to app code. */
public class MainActivity extends Activity {
    private WebView web;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);          // localStorage = progress saving
        s.setAllowFileAccess(true);            // file:///android_asset + bundled audio
        s.setMediaPlaybackRequiresUserGesture(false);
        web.setWebViewClient(new WebViewClient());
        web.setWebChromeClient(new WebChromeClient());
        web.loadUrl("file:///android_asset/index.html");
        setContentView(web);
    }

    @Override
    public void onBackPressed() {
        // Inside a session: back acts like the app's own "<- Quit to home".
        // On the home screen: exit as usual.
        web.evaluateJavascript(
            "!!document.getElementById('view-study') && document.getElementById('view-study').style.display !== 'none'",
            inStudy -> {
                if ("true".equals(inStudy)) {
                    web.evaluateJavascript(
                        "var q=document.getElementById('quit'); if (q) q.click();", null);
                } else {
                    finish();
                }
            });
    }
}
