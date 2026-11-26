package __PKG__;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Locale;
import org.json.JSONObject;

public class CapsulaWidget extends AppWidgetProvider {
  @Override
  public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
    for (int id : ids) m.updateAppWidget(id, build(c));
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
    boolean has = false;
    try {
      SharedPreferences sp = c.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
      String raw = sp.getString("capsula_widget", null);
      if (raw != null) {
        JSONObject o = new JSONObject(raw);
        streak = o.optInt("s", 0);
        name = o.optString("n", "");
        kind = o.optString("k", "conejo");
        last = o.optString("d", "");
        has = true;
      }
    } catch (Exception e) {}
    SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
    Calendar cal = Calendar.getInstance();
    String today = f.format(cal.getTime());
    cal.add(Calendar.DAY_OF_YEAR, -1);
    String yest = f.format(cal.getTime());
    boolean done = last.equals(today);
    if (!done && !last.equals(yest)) streak = 0;
    String title;
    String sub;
    int bg;
    if (!has) {
      title = "Cápsula";
      sub = "Abre la app para empezar";
      bg = R.drawable.widget_bg;
    } else if (done) {
      title = "🔥 " + streak + (streak == 1 ? " día" : " días");
      sub = "¡Racha a salvo hoy!";
      bg = R.drawable.widget_bg_ok;
    } else if (streak > 0) {
      title = "🔥 " + streak + (streak == 1 ? " día" : " días");
      sub = "Cuenta una historia y no pierdas tu racha";
      bg = R.drawable.widget_bg_warn;
    } else {
      title = "Empieza tu racha";
      sub = (name.length() > 0 ? name : "Tu mascota") + " te espera. Cuenta tu primera historia";
      bg = R.drawable.widget_bg;
    }
    RemoteViews rv = new RemoteViews(c.getPackageName(), R.layout.capsula_widget);
    rv.setTextViewText(R.id.wg_pet, emoji(kind));
    rv.setTextViewText(R.id.wg_title, title);
    rv.setTextViewText(R.id.wg_sub, sub);
    rv.setInt(R.id.wg_root, "setBackgroundResource", bg);
    Intent li = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
    if (li != null) {
      PendingIntent pi = PendingIntent.getActivity(c, 0, li, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
      rv.setOnClickPendingIntent(R.id.wg_root, pi);
    }
    return rv;
  }
}
