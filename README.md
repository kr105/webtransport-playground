# webtransport-playground

This project is a simple playground to experiment with the WebTransport API, allowing you to test the communication between a client and a server using both reliable and unreliable data transmission. Right now it is designed to work with an "echo server" where the server replies back the same message that you send to it.

## Features

- Connect to a WebTransport server using a specified URL.
- Send messages to the server using different types of transmission:
  - Both (reliable and unreliable).
  - Reliable only.
  - Unreliable only.
- Display logs for the main connection events, reliable stream, and unreliable stream.


## How to use

1. Open `index.htm` in a compatible web browser that supports the WebTransport API.
2. Enter the WebTransport server URL in the "Server URL" input field.
3. Click the "Connect" button to establish a connection with the server.
4. Once connected, enter a message in the "Message" input field.
5. Choose the desired transmission type (Both, Reliable, or Unreliable) using the radio buttons.
6. Click the "Send" button to transmit the message to the server.
7. Observe the logs for the main connection events, reliable stream, and unreliable stream in their respective text areas.

## Requirements

- A web browser with support for the WebTransport API. Check the browser compatibility table on [MDN Web Docs]( https://developer.mozilla.org/en-US/docs/Web/API/WebTransport#browser_compatibility) for the most up-to-date information.
- A WebTransport server to connect to.

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests to improve this project.