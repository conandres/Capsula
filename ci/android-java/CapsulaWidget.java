package __PKG__;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.SystemClock;
import android.util.Base64;
import android.widget.RemoteViews;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Locale;
import org.json.JSONObject;

public class CapsulaWidget extends AppWidgetProvider {
  static final String TICK = "__PKG__.WG_TICK";

  @Override
  public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
    for (int id : ids) m.updateAppWidget(id, build(c));
    alarm(c);
  }

  @Override
  public void onEnabled(Context c) {
    alarm(c);
  }

  @Override
  public void onDisabled(Context c) {
    try {
      AlarmManager a = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
      a.cancel(tickPi(c));
    } catch (Exception e) {}
  }

  @Override
  public void onReceive(Context c, Intent i) {
    super.onReceive(c, i);
    if (i != null && TICK.equals(i.getAction())) refresh(c);
  }

  static PendingIntent tickPi(Context c) {
    Intent i = new Intent(c, CapsulaWidget.class).setAction(TICK);
    return PendingIntent.getBroadcast(c, 7, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
  }

  /* Cada 15 minutos el widget recalcula el ánimo de la mascota (sin abrir la app). */
  static void alarm(Context c) {
    try {
      AlarmManager a = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
      long every = 15 * 60 * 1000L;
      a.setInexactRepeating(AlarmManager.ELAPSED_REALTIME, SystemClock.elapsedRealtime() + every, every, tickPi(c));
    } catch (Exception e) {}
  }

  public static void refresh(Context c) {
    AppWidgetManager m = AppWidgetManager.getInstance(c);
    int[] ids = m.getAppWidgetIds(new ComponentName(c, CapsulaWidget.class));
    if (ids == null) return;
    for (int id : ids) m.updateAppWidget(id, build(c));
  }

  static String emoji(String k) {
    if ("gato".equals(k)) return "🐱";
    if ("perro".equals(k)) return "🐶";
    if ("oso".equals(k)) return "🐻";
    return "🐰";
  }

  static RemoteViews build(Context c) {
    int streak = 0;
    String name = "";
    String kind = "conejo";
    String last = "";
    String theme = "azul";
    boolean has = false;
    double food = 75, clean = 80, fun = 70, en = 90, love = 80;
    long t = System.currentTimeMillis(), rest = 0;
    Bitmap bmp = null;
    try {
      SharedPreferences sp = c.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
      String raw = sp.getString("capsula_widget", null);
      if (raw != null) {
        JSONObject o = new JSONObject(raw);
        streak = o.optInt("s", 0);
        name = o.optString("n", "");
        kind = o.optString("k", "conejo");
        last = o.optString("d", "");
        theme = o.optString("th", "azul");
        JSONObject p = o.optJSONObject("p");
        if (p != null) {
          food = p.optDouble("f", 75);
          clean = p.optDouble("c", 80);
          fun = p.optDouble("u", 70);
          en = p.optDouble("e", 90);
          love = p.optDouble("l", 80);
          t = p.optLong("t", t);
          rest = p.optLong("r", 0);
        }
        has = true;
      }
      String img = sp.getString("capsula_widget_img", null);
      if (img != null && img.length() > 100) {
        byte[] b = Base64.decode(img, Base64.DEFAULT);
        bmp = BitmapFactory.decodeByteArray(b, 0, b.length);
      }
    } catch (Exception e) {}

    long now = System.currentTimeMillis();
    double m = Math.max(0, (now - t) / 60000.0);
    double ms = Math.min(m, Math.max(0, (rest - t) / 60000.0));
    double ma = m - ms;
    love = Math.max(0, love - ms / 20 - ma / 9);
    food = Math.max(0, food - ms / 14 - ma / 7);
    clean = Math.max(0, clean - m / 16);
    fun = Math.max(0, fun - ms / 30 - ma / 11);
    en = Math.max(0, Math.min(100, en + ms * 6) - ma / 18);
    boolean asleep = rest > now;

    SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
    Calendar cal = Calendar.getInstance();
    String today = f.format(cal.getTime());
    cal.add(Calendar.DAY_OF_YEAR, -1);
    String yest = f.format(cal.getTime());
    boolean done = last.equals(today);
    if (!done && !last.equals(yest)) streak = 0;
    String pn = name.length() > 0 ? name : "Tu mascota";

    String say;
    if (!has) say = "Abre Cápsula para conocer a tu mascota";
    else if (asleep) say = "Zzz… estoy durmiendo";
    else if (food < 35) say = "¡Tengo hambre! ¿Me das de comer?";
    else if (clean < 30) say = "Necesito un baño…";
    else if (fun < 30) say = "Quiero jugar contigo";
    else if (en < 20) say = "Tengo mucho sueño";
    else if (love < 30) say = "Te extraño, ven a verme";
    else if (!done) say = "¿Qué hiciste hoy? Cuéntamelo";
    else say = "¡Estoy feliz contigo!";

    String title;
    String sub;
    int subColor = 0xFFFFFFFF;
    if (!has) {
      title = "Cápsula";
      sub = "Abre la app para empezar";
    } else if (streak > 0) {
      title = "🔥 " + streak + (streak == 1 ? " día" : " días");
      if (done) {
        sub = "¡Racha a salvo hoy!";
        subColor = 0xFFB8F5CF;
      } else {
        sub = "Cuenta una historia y no la pierdas";
        subColor = 0xFFFFD27A;
      }
    } else {
      title = "Empieza tu racha";
      sub = "Cuenta tu primera historia con " + pn;
    }

    int bg = R.drawable.widget_bg_azul;
    if ("rosa".equals(theme)) bg = R.drawable.widget_bg_rosa;
    else if ("negro".equals(theme)) bg = R.drawable.widget_bg_negro;

    RemoteViews rv = new RemoteViews(c.getPackageName(), R.layout.capsula_widget);
    if (bmp != null) {
      rv.setImageViewBitmap(R.id.wg_img, bmp);
      rv.setViewVisibility(R.id.wg_img, android.view.View.VISIBLE);
      rv.setViewVisibility(R.id.wg_pet, android.view.View.GONE);
    } else {
      rv.setTextViewText(R.id.wg_pet, emoji(kind));
      rv.setViewVisibility(R.id.wg_img, android.view.View.GONE);
      rv.setViewVisibility(R.id.wg_pet, android.view.View.VISIBLE);
    }
    rv.setTextViewText(R.id.wg_name, pn);
    rv.setTextViewText(R.id.wg_say, say);
    rv.setTextViewText(R.id.wg_title, title);
    rv.setTextViewText(R.id.wg_sub, sub);
    rv.setTextColor(R.id.wg_sub, subColor);
    rv.setInt(R.id.wg_root, "setBackgroundResource", bg);
    Intent li = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
    if (li != null) {
      PendingIntent pi = PendingIntent.getActivity(c, 0, li, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
      rv.setOnClickPendingIntent(R.id.wg_root, pi);
    }
    return rv;
  }
}
