interface DataParams {
  [key: string]: any;
}

interface DefaultOptions {
  key: string;
  groupKey: string;
}

interface BrowserOptions extends DefaultOptions {
  topLevel?: boolean;
}

interface EventItem {
  node: Node;
  handler: EventListener | null;
  capture: EventListenerOptions | boolean;
}

interface EventHandlers {
  [eventName: string]: Array<EventItem>;
}

interface NotificationParams {
  libraryKey: string;
  eventName: string;
  params: DataParams;
  key: DefaultOptions["key"];
  groupKey: DefaultOptions["groupKey"];
  direction: boolean;
}

interface SubscribeParams {
  eventName: string;
  handler: Function | null;
}

class DefaultConnector {
  key: DefaultOptions["key"];
  groupKey: DefaultOptions["groupKey"];
  _eventHandlers: EventHandlers = {};

  constructor({ key, groupKey }: DefaultOptions) {
    this.key = key;
    this.groupKey = groupKey;
  }

  _addListener(
    node: Node,
    eventName: string,
    handler: EventListener | null,
    capture: EventListenerOptions | boolean = false
  ) {
    if (!(eventName in this._eventHandlers)) {
      this._eventHandlers[eventName] = [];
    }
    // here we track the events and their nodes (note that we cannot
    // use node as Object keys, as they'd get coerced into a string
    this._eventHandlers[eventName].push({
      node,
      handler,
      capture,
    });
    node.addEventListener(eventName, handler, capture);
  }

  _removeAllListeners(targetNode: Node, eventName: string) {
    // remove listeners from the matching nodes
    if (!(eventName in this._eventHandlers)) {
      this._eventHandlers[eventName] = [];
    }

    this._eventHandlers[eventName]
      .filter(({ node }) => node === targetNode)
      .forEach(({ node, handler, capture }) =>
        node.removeEventListener(eventName, handler, capture)
      );

    // update _eventHandlers global
    this._eventHandlers[eventName] = this._eventHandlers[eventName].filter(
      ({ node }) => node !== targetNode
    );
  }

  _dispatch(
    targetNode: Node,
    eventName: string,
    { key, params }: NotificationParams
  ) {
    if (key === this.key) {
      return;
    }
    targetNode.dispatchEvent(
      new CustomEvent(eventName, {
        detail: params,
      })
    );
  }

  _generateEventName(eventName: string) {
    return `${this.groupKey}.${eventName}`;
  }

  subscribe({ eventName, handler = null }: SubscribeParams) {
    if (!eventName) {
      throw "not have eventName";
    }

    const newParams = {
      eventName: this._generateEventName(eventName),
      handler,
    };

    this._subscribe(newParams);
  }

  _subscribe(params: SubscribeParams) {
    console.log(params);
    throw "must override _subscribe";
  }

  notification({ eventName, params = {} }: DataParams) {
    if (!eventName) {
      throw "not have eventName";
    }

    const notification = {
      libraryKey: "cizion-connector",
      eventName: this._generateEventName(eventName),
      key: this.key,
      groupKey: this.groupKey,
      params,
      direction: false,
    };

    this._notification(notification);
  }

  _notification(notification: NotificationParams) {
    console.log(notification);
    throw "must override _notification";
  }

  init() {
    throw "must override init";
  }
}

class BrowserConnector extends DefaultConnector {
  topLevel: BrowserOptions["topLevel"];
  constructor({ topLevel = self === top, ...params }: BrowserOptions) {
    super(params);
    this.topLevel = topLevel;
  }

  init() {
    window.addEventListener(
      "message",
      ({ data }: MessageEvent<NotificationParams>) => {
        this._notification(data);
      }
    );
  }

  _broadCast(notification: NotificationParams) {
    let list = document.getElementsByTagName("iframe");
    Array.prototype.forEach.call(list, (iframe: HTMLIFrameElement) => {
      // const flag = iframe.classList.contains(this.groupKey);
      // flag && iframe.contentWindow?.postMessage(notification, "*");
      iframe.contentWindow?.postMessage(notification, "*");
    });
  }

  _subscribe({ eventName, handler }: SubscribeParams) {
    this._removeAllListeners(document, eventName);
    this._addListener(document, eventName, (e) => {
      handler && handler((e as Event & { detail: any }).detail);
    });
  }

  _notification(notification: NotificationParams) {
    let { libraryKey, direction, eventName } = notification;

    if (libraryKey !== "cizion-connector") {
      return;
    }

    if (this.topLevel) {
      direction = true;
      notification.direction = direction;
    }

    if (!direction) {
      window.parent.postMessage(notification, "*");
    } else {
      this._dispatch(document, eventName, notification);
      this._broadCast(notification);
    }
  }
}

type ConnectorList = {
  browser: BrowserConnector;
  default: DefaultConnector;
};

type OptionsList = {
  browser: BrowserOptions;
  default: DefaultOptions;
};

const connectorList = {
  browser: BrowserConnector,
  default: DefaultConnector,
};

const Connector = (() => {
  let connector: DefaultConnector;

  const _getInstance = () => {
    if (!connector) {
      throw "must call init";
    }

    return connector;
  };

  const subscribe = (eventName: string, handler: Function | null = null) => {
    _getInstance().subscribe({ eventName, handler });
  };

  const notification = (eventName: string, params: DataParams = {}) => {
    _getInstance().notification({ eventName, params });
  };

  const init = (
    type: keyof ConnectorList,
    options: OptionsList[keyof ConnectorList]
  ) => {
    if (!connectorList[type]) {
      throw "connector is not defined";
    }

    connector = new connectorList[type](options);
    connector.init();
  };

  return {
    init,
    subscribe,
    notification,
  };
})();

export default Connector;
