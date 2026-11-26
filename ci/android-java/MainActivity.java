package __PKG__;

import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Matrix;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
  private String pending = null;
  private String go = null;

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    try {
      getBridge().getWebView().addJavascriptInterface(new Js(), "CapsulaNative");
    } catch (Exception e) {}
    try {
      android.webkit.WebSettings ws = getBridge().getWebView().getSettings();
      ws.setSupportZoom(false);
      ws.setBuiltInZoomControls(false);
      ws.setDisplayZoomControls(false);
      ws.setTextZoom(Math.min(ws.getTextZoom(), 115));
    } catch (Exception e) {}
    readIntent(getIntent());
  }

  @Override
  protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
    readIntent(intent);
    try {
      final WebView w = getBridge().getWebView();
      w.post(new Runnable() {
        public void run() {
          w.evaluateJavascript("window.shareIn&&window.shareIn()", null);
        }
      });
    } catch (Exception e) {}
  }

  @Override
  public void onPause() {
    super.onPause();
    try {
      CapsulaWidget.refresh(this);
    } catch (Exception e) {}
  }

  public class Js {
    @JavascriptInterface
    public String takeGo() {
      String g = go;
      go = null;
      return g == null ? "" : g;
    }

    @JavascriptInterface
    public String takeShare() {
      String p = pending;
      pending = null;
      return p == null ? "" : p;
    }
  }

  @SuppressWarnings("deprecation")
  private void readIntent(Intent i) {
    try {
      if (i != null && i.getStringExtra("go") != null) {
        go = i.getStringExtra("go");
        i.removeExtra("go");
      }
      if (i == null || !Intent.ACTION_SEND.equals(i.getAction())) return;
      String type = i.getType() == null ? "" : i.getType();
      String text = i.getStringExtra(Intent.EXTRA_TEXT);
      JSONObject o = new JSONObject();
      if (type.startsWith("image/")) {
        Uri u = (Uri) i.getParcelableExtra(Intent.EXTRA_STREAM);
        if (u == null) return;
        String d = imageToData(u);
        if (d == null) return;
        o.put("t", "img");
        o.put("d", d);
        if (text != null) o.put("x", text);
      } else if (text != null && text.length() > 0) {
        o.put("t", "txt");
        o.put("x", text.length() > 2000 ? text.substring(0, 2000) : text);
      } else {
        return;
      }
      pending = o.toString();
      i.setAction(Intent.ACTION_MAIN);
    } catch (Exception e) {}
  }

  private String imageToData(Uri u) {
    try {
      InputStream in = getContentResolver().openInputStream(u);
      BitmapFactory.Options b = new BitmapFactory.Options();
      b.inJustDecodeBounds = true;
      BitmapFactory.decodeStream(in, null, b);
      in.close();
      int s = 1;
      while (Math.max(b.outWidth, b.outHeight) / s > 2400) s *= 2;
      BitmapFactory.Options o = new BitmapFactory.Options();
      o.inSampleSize = s;
      in = getContentResolver().openInputStream(u);
      Bitmap bm = BitmapFactory.decodeStream(in, null, o);
      in.close();
      if (bm == null) return null;
      int rot = 0;
      if (Build.VERSION.SDK_INT >= 24) {
        InputStream ei = getContentResolver().openInputStream(u);
        android.media.ExifInterface ex = new android.media.ExifInterface(ei);
        int or = ex.getAttributeInt(android.media.ExifInterface.TAG_ORIENTATION, 1);
        ei.close();
        if (or == 6) rot = 90;
        else if (or == 3) rot = 180;
        else if (or == 8) rot = 270;
      }
      float k = Math.min(1f, 1600f / Math.max(bm.getWidth(), bm.getHeight()));
      Matrix m = new Matrix();
      m.postScale(k, k);
      if (rot != 0) m.postRotate(rot);
      Bitmap r = Bitmap.createBitmap(bm, 0, 0, bm.getWidth(), bm.getHeight(), m, true);
      ByteArrayOutputStream bo = new ByteArrayOutputStream();
      r.compress(Bitmap.CompressFormat.JPEG, 82, bo);
      return "data:image/jpeg;base64," + Base64.encodeToString(bo.toByteArray(), Base64.NO_WRAP);
    } catch (Exception e) {
      return null;
    }
  }
}
