package com.devansh.rocketieeai;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.Window;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {

    private WebView webView;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        if (window != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.setStatusBarColor(Color.parseColor("#FFD600"));
        }

        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setMediaPlaybackRequiresUserGesture(false);

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    request.grant(request.getResources());
                }
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedError(
                    WebView view,
                    WebResourceRequest request,
                    WebResourceError error
            ) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP && request.isForMainFrame()) {
                    loadOfflineFallback(view);
                }
            }
        });

        setContentView(webView);
        webView.loadUrl(getString(R.string.app_url));
    }

    private void loadOfflineFallback(WebView view) {
        String html = "<!DOCTYPE html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'>"
                + "<style>body{font-family:sans-serif;background:#FFFDF5;color:#0F172A;display:flex;flex-direction:column;"
                + "align-items:center;justify-content:center;height:100vh;margin:0;padding:24px;text-align:center;}"
                + ".badge{background:#FFD600;padding:12px 20px;border-radius:16px;font-weight:bold;margin-bottom:16px;}"
                + "button{background:#FFD600;border:none;padding:12px 24px;border-radius:12px;font-weight:bold;font-size:16px;margin-top:16px;}"
                + "</style></head><body>"
                + "<div class='badge'>Rocketiee AI 🚀</div>"
                + "<h2>Let’s Explore Together 🚀</h2>"
                + "<p>Your Ideas. Your Intelligence. Your India.<br/>Created by Devansh</p>"
                + "<p style='color:#475569;font-size:14px;'>Please connect to the internet to reach Rocketiee AI.</p>"
                + "<button onclick=\"location.href='" + getString(R.string.app_url) + "'\">Retry Connection</button>"
                + "</body></html>";
        view.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
