export const showNotification = (title: string, message: string) => {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icon-128.png'), // Ensure we create this later
    title,
    message,
    priority: 2
  });
};
