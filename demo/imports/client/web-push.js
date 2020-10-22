import { Meteor } from 'meteor/meteor';

const urlBase64ToUint8Array = (base64String) => {
  console.log("[base64String]", base64String)
  const rawData = window.atob(base64String);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const webPush = {
  isEnabled: false,
  _publicKey: Meteor.settings.public.vapid.publicKey,
  async check() {
    const swRegistration = await navigator.serviceWorker.ready;
    const subscription = await swRegistration.pushManager.getSubscription();
    if (subscription) {
      this.subscription = JSON.stringify(subscription);
    }
  },
  async disable() {
    try {
      const swRegistration = await navigator.serviceWorker.ready;
      if (swRegistration && 'PushManager' in window) {
        const subscription = await swRegistration.pushManager.getSubscription();
        await subscription.unsubscribe();
        this.isEnabled = false;
        this.subscription = void 0;
      }
    } catch (disableError) {
      console.error('[webPush.disable] Error:', disableError);
    }
  },
  async enable() {
    console.log(this);
    try {
      this.publicKey = urlBase64ToUint8Array(this._publicKey);
      const consent = await Notification.requestPermission();

      if (consent === 'granted') {
        const swRegistration = await navigator.serviceWorker.ready;
        const subscription = await swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.publicKey
        });

        this.subscription = JSON.stringify(subscription);
      }
    } catch (enableError) {
      console.error('[webPush.enable] Error:', enableError);
    }
  }
};

export { webPush };
