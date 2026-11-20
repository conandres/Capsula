/* Configuración de Cápsula. Datos de conexión de Firebase.
   Estos valores NO son secretos: van en la web pública. La seguridad la dan las reglas de Firestore. */
window.CAPSULA_CONFIG = {
  /* Firebase Console > Configuración del proyecto > Tus apps > App web > "Config" */
  firebase: {
    apiKey: 'AIzaSyD8xgWmNY0XkIi4-KpbUwPlmATK2FSZCA0',
    authDomain: 'project-a33e589c-b911-4488-aa3.firebaseapp.com',
    projectId: 'project-a33e589c-b911-4488-aa3',
    storageBucket: 'project-a33e589c-b911-4488-aa3.firebasestorage.app',
    messagingSenderId: '440518399932',
    appId: '1:440518399932:web:ffe6da5640321afb633db9'
  },
  /* Firebase Console > Authentication > Método de acceso > Google > "ID de cliente web" */
  /* Cápsula Plus: false = los límites, anuncios y tienda están apagados para todos. */
  plusOn: false,
  /* AdMob: estos son los IDs de PRUEBA oficiales de Google. Cuando tengas tu cuenta de AdMob, cámbialos por los tuyos y pon admobProd: true */
  admobRewardedId: 'ca-app-pub-4743502426219538/8520575030',
  admobProd: false,
  googleClientId: '440518399932-vulhk1efet3tv6s22dtce23kk4qk0afl.apps.googleusercontent.com'
};
