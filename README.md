# Velvet

Velvet, an experimental JavaScript framework for building supercharged web components.

## Summary

A template like this...

```html
<script>
  let count = 0;

  function increment () {
    count += 1;
  }
</script>

<button @click={increment}>
  Clicked {count} times
</button>
```

...is transformed into a web component with efficient DOM mutations...

```js
import { signal, html, clone, traverse, text, on, append, define } from '@intrnl/velvet/internal';

let template0 = html('<button>Clicked <!> times</button>');

function setup ($$root, $$host) {
  let count = signal(0);

  function increment () {
    count.value += 1;
  }

  let fragment0 = clone(template0);

  let marker0 = traverse(fragment0, [0, 1]);
  let child0 = traverse(fragment0, [0]);

  text(marker0, () => count.value);
  on(child0, 'click', increment);

  append($$root, fragment0);
}

export default define('x-app', setup, {}, []);
```

## Overview

### Hello, world!

Velvet components are self-contained fragments of HTML-like templating along
with related scripting and styling code for it, written in a `.velvet` file.

```html
<h1>Hello, world!</h1>
```

These components are generated into a valid web component, and are named based
off their file names by default, so `Greeting.velvet` becomes `x-greeting`, and
you can use it as you would with regular HTML elements.

```html
<x-greeting name='world'></x-greeting>
```

```js
let greet = document.createElement('x-greeting');
greet.name = 'world';
```

### Expressions

Our current component looks a little empty, so let's give it some flair by first
defining a `<script>` element to define our `name` variable in.

```html
<script>
  let name = 'world';
</script>

<h1>Hello, world!</h1>
```

We can then refer to the name variable within the template:

```html
<h1>Hello, {name}!</h1>
```

These curly braces here acts as a window to running JS expressions right within
the template, so we can do other things like calling a format function like so:

```html
<script>
  const today = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', { weekday: 'long' });
</script>

<p>Today is {formatter.format(today)}</p>
```

These curly braces can also be used to control element attributes

```html
<script>
  let name = 'Katherine Johnson';
  let src = 'https://i.imgur.com/MK3eW3As.jpg';
</script>

<h3>Amazing scientists</h3>

<img src={src} alt={name} />
```

### Styling

Velvet components can have a `<style>` tag, where all the styling are scoped to
the component. They can't affect other elements that are elsewhere in your app.

```html
<p>This is a paragraph.</p>

<style>
	p {
		color: purple;
		font-size: 2em;
	}
</style>
```
