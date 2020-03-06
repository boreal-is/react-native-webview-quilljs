import * as React from "react";
import "react-quill/dist/quill.snow.css";
import "./theme.css";
import QuillComponentView from "./QuillComponent.view";
import { WebviewQuillJSMessage, WebviewQuillJSEvents } from "./models";
import * as Quill from "quill";

interface State {
  backgroundColor: string;
  debugMessages: string[];
  containerHeight: number;
  content: string | any;
  defaultContent: any;
  doShowQuillComponentDebugMessages: boolean;
  isReadOnly: boolean;
  modules: object;
  noPadding: boolean;
}

class QuillComponent extends React.Component<{}, State> {
  quillComponentRef: React.RefObject<HTMLDivElement>;

  constructor(props: any) {
    super(props);
    this.quillComponentRef = React.createRef();
    this.state = {
      backgroundColor: "#fff",
      debugMessages: ["test"],
      containerHeight: null,
      content: null,
      defaultContent: null,
      doShowQuillComponentDebugMessages: false,
      isReadOnly: false,
      modules: {},
      noPadding: false
    };
  }

  onChange = (
    content: string,
    delta: Quill.Delta,
    source: Quill.Sources,
    editor: any
  ) => {
    this.sendMessage({
      msg: WebviewQuillJSEvents.ON_CHANGE,
      payload: {
        html: editor.getHTML(),
        delta: editor.getContents(),
        text: editor.getText(),
        source,
        editor
      }
    });
  };

  onChangeSelection = (
    range: Quill.RangeStatic,
    source: Quill.RangeStatic,
    editor: any
  ) => {
    this.sendMessage({
      msg: WebviewQuillJSEvents.ON_CHANGE_SELECTION,
      payload: {
        range,
        selection: editor.getSelection(),
        html: editor.getHTML(),
        delta: editor.getContents(),
        text: editor.getText(),
        source,
        editor
      }
    });
  };
  onFocus = (range: Quill.RangeStatic, source: Quill.Sources, editor: any) => {
    this.sendMessage({
      msg: WebviewQuillJSEvents.ON_FOCUS,
      payload: {
        contents: editor.getContents(),
        range,
        source,
        editor
      }
    });
  };
  onBlur = (previousRange: any, source: Quill.Sources, editor: any) => {
    this.sendMessage({
      msg: WebviewQuillJSEvents.ON_BLUR,
      payload: {
        contents: editor.getContents(),
        previousRange,
        source,
        editor
      }
    });
  };
  onKeyPress = (event: any) => {
    this.sendMessage({
      msg: WebviewQuillJSEvents.ON_KEY_PRESS,
      payload: {
        event
      }
    });
  };
  onKeyDown = (event: any) => {
    this.sendMessage({
      msg: WebviewQuillJSEvents.ON_KEY_DOWN,
      payload: {
        event
      }
    });
  };
  onKeyUp = (event: any) => {
    this.sendMessage({
      msg: WebviewQuillJSEvents.ON_KEY_UP,
      payload: {
        event
      }
    });
  };

  componentDidMount = () => {
    const { containerHeight, noPadding } = this.state;
    this.addEventListeners();
    
    if (noPadding) {
      this.setNoPadding(true);
    } else {
      if (this.quillComponentRef && containerHeight === null) {
        this.setContainerHeight();
      }
    }

    this.sendMessage({
      msg: WebviewQuillJSEvents.QUILLJS_COMPONENT_MOUNTED
    });
  };

  componentDidUpdate = (prevProps: {}, prevState: State) => {
    const { isReadOnly, noPadding } = this.state;
    if (isReadOnly !== prevState.isReadOnly) {
      this.setContainerHeight();
    }
    if (!prevState.noPadding && noPadding) {
      this.setNoPadding(true);
    } else if (prevState.noPadding && !noPadding) {
      this.setNoPadding(false);
    }
  };

  private setNoPadding(noPadding: boolean) {
    if (noPadding) {
      document.getElementsByClassName('ql-editor')[0]?.classList.add('no-padding');
    } else {
      document.getElementsByClassName('ql-editor')[0]?.classList.remove('no-padding');
    }
  }

  private setContainerHeight = () => {
    const quillDivElement = this.quillComponentRef.current;
    const toolBar = quillDivElement.querySelector(".ql-toolbar");
    const windowHeight = quillDivElement.clientHeight;
    this.setState({
      containerHeight: windowHeight - (toolBar ? toolBar.clientHeight + 2 : 0)
    });
  };

  private addDebugMessage = (msg: any) => {
    if (typeof msg === "object") {
      this.addDebugMessage("STRINGIFIED");
      this.setState({
        debugMessages: [
          ...this.state.debugMessages,
          JSON.stringify(msg, null, 4)
        ]
      });
    } else {
      this.setState({ debugMessages: [...this.state.debugMessages, msg] });
    }
  };

  private addEventListeners = () => {
    if (document) {
      document.addEventListener("message", this.handleMessage);
      this.addDebugMessage("set document listeners");
      document.addEventListener("click", this.handleOnClick);
      this.sendMessage({
        msg: WebviewQuillJSEvents.DOCUMENT_EVENT_LISTENER_ADDED
      });
    }
    if (window) {
      window.addEventListener("message", this.handleMessage);
      this.addDebugMessage("setting Window");
      this.sendMessage({
        msg: WebviewQuillJSEvents.WINDOW_EVENT_LISTENER_ADDED
      });
    }
    if (!document && !window) {
      this.sendMessage({
        error: WebviewQuillJSEvents.UNABLE_TO_ADD_EVENT_LISTENER
      });
      return;
    }
  };

  private handleMessage = (event: any & { data: State }) => {
    this.addDebugMessage(event.data);
    try {
      this.setState({ ...this.state, ...event.data });
    } catch (error) {
      this.addDebugMessage({ error: JSON.stringify(error) });
    }
  };

  private handleOnClick = (event: any) => {
    const target = event.target;
    if (!target) {
      return;
    }
    const parentAnchor = target.closest('a');
    if (parentAnchor && parentAnchor.href && parentAnchor.tagName === 'A' && (parentAnchor.className === 'ql-preview' || this.state.isReadOnly)) {
      // User pressed on a link to navigate
      event.preventDefault();
      this.addDebugMessage("User clicked on a link");
      this.sendMessage({
        msg: WebviewQuillJSEvents.ON_LINK_PRESS,
        payload: {
          url: parentAnchor.href
        }
      });
    }
  }

  protected sendMessage = (message: WebviewQuillJSMessage) => {
    // @ts-ignore
    if (window.ReactNativeWebView) {
      // @ts-ignore
      window.ReactNativeWebView.postMessage(JSON.stringify(message));
    }
  };

  render() {
    const {
      backgroundColor,
      containerHeight,
      content,
      debugMessages,
      defaultContent,
      doShowQuillComponentDebugMessages,
      isReadOnly
    } = this.state;
    return (
      <>
        <QuillComponentView
          addDebugMessage={this.addDebugMessage}
          backgroundColor={backgroundColor}
          containerHeight={containerHeight}
          defaultContent={defaultContent}
          onChange={this.onChange}
          onChangeSelection={this.onChangeSelection}
          onFocus={this.onFocus}
          onBlur={this.onBlur}
          onKeyPress={this.onKeyPress}
          onKeyDown={this.onKeyDown}
          onKeyUp={this.onKeyUp}
          isReadOnly={isReadOnly as boolean}
          quillComponentRef={this.quillComponentRef}
          content={content}
        />
        {doShowQuillComponentDebugMessages && (
          <div
            style={{
              backgroundColor: "#fff",
              maxHeight: "200px",
              overflow: "auto",
              padding: 5,
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 15000
            }}
            id="messages"
          >
            <ul>
              {debugMessages.map((message: string, index: number) => {
                return <li key={index}>{message}</li>;
              })}
            </ul>
          </div>
        )}
      </>
    );
  }
}

export default QuillComponent;
