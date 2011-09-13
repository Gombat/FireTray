/* -*- Mode: js2; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

var EXPORTED_SYMBOLS = [ "mozt" ];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/ctypes.jsm");
Cu.import("resource://moztray/gobject.jsm");
Cu.import("resource://moztray/gdk.jsm");
Cu.import("resource://moztray/gtk.jsm");
Cu.import("resource://moztray/commons.js");

if ("undefined" == typeof(mozt.Handler))
  ERROR("MoztIcon*.jsm MUST be imported from/after MoztHandler !");

// pointers to JS functions. should *not* be eaten by GC ("Running global
// cleanup code from study base classes" ?)
var mozt_iconActivateCb;
var mozt_popupMenuCb;
var mozt_menuItemQuitActivateCb;

mozt.IconLinux = {
  tryIcon: null,
  menu: null,
  appName: null,
  ICON_FILENAME_DEFAULT: null,
  ICON_SUFFIX: "32.png",

  init: function() {

    try {

      // init tray icon, some variables
      this.trayIcon  = gtk.gtk_status_icon_new();
      this.appName = Services.appinfo.name.toLowerCase();
      this.ICON_FILENAME_DEFAULT = mozt.Utils.chromeToPath(
        "chrome://moztray/skin/" +  this.appName + this.ICON_SUFFIX);

      this.setDefaultImage();

      // build icon popup menu
      this.menu = gtk.gtk_menu_new();
      // shouldn't need to convert to utf8 thank to js-ctypes
		  var menuItemQuitLabel = mozt.Utils.strings.GetStringFromName("popupMenu.itemLabel.Quit");
      var menuItemQuit = gtk.gtk_image_menu_item_new_with_label(
        menuItemQuitLabel);
      var menuItemQuitIcon = gtk.gtk_image_new_from_stock(
        "gtk-quit", gtk.GTK_ICON_SIZE_MENU);
      gtk.gtk_image_menu_item_set_image(menuItemQuit, menuItemQuitIcon);
      var menuShell = ctypes.cast(this.menu, gtk.GtkMenuShell.ptr);
      gtk.gtk_menu_shell_append(menuShell, menuItemQuit);

      mozt_menuItemQuitActivateCb = gobject.GCallback_t(
        function(){mozt.Handler.quitApplication();});
      gobject.g_signal_connect(menuItemQuit, "activate",
                                  mozt_menuItemQuitActivateCb, null);

      var menuWidget = ctypes.cast(this.menu, gtk.GtkWidget.ptr);
      gtk.gtk_widget_show_all(menuWidget);

      // here we do use a function handler because we need the args passed to
      // it ! But we need to abandon 'this' in popupMenu()
      mozt_popupMenuCb =
        gtk.GCallbackMenuPopup_t(mozt.Handler.popupMenu);
      gobject.g_signal_connect(this.trayIcon, "popup-menu",
                                  mozt_popupMenuCb, this.menu);

      this.setDefaultTooltip();

      // watch out for binding problems ! here we prefer to keep 'this' in
      // showHideToTray() and abandon the args.
      mozt_iconActivateCb = gobject.GCallback_t(
        function(){mozt.Handler.showHideToTray();});
      gobject.g_signal_connect(this.trayIcon, "activate",
                                  mozt_iconActivateCb, null);


    } catch (x) {
      ERROR(x);
      return false;
    }

    return true;
  },

  shutdown: function() {
    gobject.close();
    gdk.close();
    gtk.close();
    // glib.close();
  },

  setImage: function(filename) {
    if (!this.trayIcon)
      return false;
    LOG(filename);

    try {
      gtk.gtk_status_icon_set_from_file(this.trayIcon,
                                        filename);
    } catch (x) {
      ERROR(x);
      return false;
    }
    return true;
  },

  setDefaultImage: function() {
    if (!this.ICON_FILENAME_DEFAULT)
      throw "Default application icon filename not set";
    this.setImage(this.ICON_FILENAME_DEFAULT);
  },

  // GTK bug: Gdk-CRITICAL **: IA__gdk_window_get_root_coords: assertion `GDK_IS_WINDOW (window)' failed
  setTooltip: function(toolTipStr) {
    if (!this.trayIcon)
      return false;
    gtk.gtk_status_icon_set_tooltip_text(this.trayIcon,
                                         toolTipStr);
    return true;
  },

  setDefaultTooltip: function() {
    if (!this.appName)
      throw "application name not initialized";
    this.setTooltip(this.appName);
  },

  // SetIconText(GtkStatusIcon *tray_icon, const char *text, const char *color) {
  setText: function() {

  // // build background from image
  // GdkPixbuf* special_icon = gdk_pixbuf_new_from_file("newmail.png", NULL); // GError **error);
  // GdkPixbuf *dest = gdk_pixbuf_copy(special_icon);
  // int w=gdk_pixbuf_get_width(special_icon);
  // int h=gdk_pixbuf_get_height(special_icon);

  // // prepare colors/alpha
  // GdkColormap* cmap=gdk_screen_get_system_colormap(gdk_screen_get_default());
  // int screen_depth=24;
  // GdkVisual* visual = gdk_colormap_get_visual(cmap);
  // screen_depth = visual->depth;
  // GdkColor fore = { 0, 0, 0, 0 };
  // GdkColor alpha  = { 0xFFFF, 0xFFFF, 0xFFFF, 0xFFFF};
  // gdk_color_parse  (color, &fore) )
  // if(fore.red==alpha.red && fore.green==alpha.green && fore.blue==alpha.blue) {
  //   alpha.red=0; //make sure alpha is different from fore
  // }
  // gdk_colormap_alloc_color (cmap, &fore, TRUE, TRUE);
  // gdk_colormap_alloc_color (cmap, &alpha, TRUE, TRUE);

  // // build pixmap with rectangle
  // GdkPixmap *pm = gdk_pixmap_new (NULL, w, h, screen_depth);
  // GdkGC *gc = gdk_gc_new (pm); // graphic context. DEPRECATED ?
  // gdk_gc_set_foreground(gc,&alpha);
  // /* gdk_draw_rectangle(pm,gc,TRUE, 0, 0, w ,h ); */
  // cairo_t *cr;
  // cr = gdk_cairo_create(pm);
  // cairo_rectangle(cr, 0, 0, w, h);
  // /* void                cairo_rectangle                     (cairo_t *cr, */
  // /*                                                          double x, */
  // /*                                                          double y, */
  // /*                                                          double width, */
  // /*                                                          double height); */
  // cairo_set_source_rgb(cr, 1, 1, 1); /* TODO: consider cairo_set_source_rgba (notice the ending "a" for alpha) */
  // cairo_fill(cr);
  // cairo_destroy(cr);

  // // build text
  // GtkWidget *scratch = gtk_window_new(GTK_WINDOW_TOPLEVEL);
  // PangoLayout *layout = gtk_widget_create_pango_layout(scratch, NULL);
  // gtk_widget_destroy(scratch);
  // PangoFontDescription *fnt = pango_font_description_from_string("Sans 18");
  // pango_font_description_set_weight (fnt,PANGO_WEIGHT_SEMIBOLD);
  // pango_layout_set_spacing            (layout,0);
  // pango_layout_set_font_description   (layout, fnt);
  // pango_layout_set_text (layout, (gchar *)text,-1);
  // int tw=0;
  // int th=0;
  // int sz;
  // int border=4;
  // pango_layout_get_pixel_size(layout, &tw, &th);
  // while( (tw>w - border || th > h - border)) //fit text to the icon by decreasing font size
  // {
  //   sz=pango_font_description_get_size (fnt);
  //   if(sz<MIN_FONT_SIZE) {
  //     sz=MIN_FONT_SIZE;
  //     break;
  //   }
  //   sz-=PANGO_SCALE;
  //   pango_font_description_set_size (fnt,sz);
  //   pango_layout_set_font_description   (layout, fnt);
  //   pango_layout_get_pixel_size(layout, &tw, &th);
  // }
  // // center text
  // int px, py;
  // px=(w-tw)/2;
  // py=(h-th)/2;

  // // draw text on pixmap
  // gdk_draw_layout_with_colors (pm, gc, px, py, layout, &fore, NULL);

  // GdkPixbuf *buf = gdk_pixbuf_get_from_drawable (NULL, pm, NULL, 0, 0, 0, 0, w, h);
  // g_object_unref (pm);
  // GdkPixbuf *alpha_buf = gdk_pixbuf_add_alpha  (buf, TRUE, (guchar)alpha.red, (guchar)alpha.green, (guchar)alpha.blue);

  // // cleaning
  // g_object_unref (buf);
  // g_object_unref (layout);
  // pango_font_description_free (fnt);
  // g_object_unref (gc);


  // //merge the rendered text on top
  // gdk_pixbuf_composite (alpha_buf,dest,0,0,w,h,0,0,1,1,GDK_INTERP_NEAREST,255);
  // g_object_unref(alpha_buf);


  // gtk_status_icon_set_from_pixbuf(GTK_STATUS_ICON(tray_icon), GDK_PIXBUF(dest));

  }

}; // mozt.IconLinux