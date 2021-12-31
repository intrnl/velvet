# Components

## Understanding components

Velvet components are a reusable, self-contained code encapsulating HTML, CSS,
and JS that belongs together, written into a `.velvet` file.

```hbs
<div>Hello world!</div>
```

Components are defined as a custom HTML element, and the names are based off of
the source file name, so `Greeting.velvet` becomes `x-greeting`, and you can use
it like you would with regular HTML elements:

```html
<x-greeting name='world'></x-greeting>
```

```js
let greeting = document.createElement('x-greeting');
```

## Expressions

Let's give some flair into the template. We'll add a `<script>` element to the
component, and define a `name` variable.

```hbs
<script>
  let name = 'world';
</script>

<div>Hello world!</div>
```

We can then refer to the `name` variable within the template:

```hbs
<div>Hello {name}!</div>
```

The curly braces in `{name}` acts as a window to running JS expressions right
within the template, like calling a format function:

```hbs
<script>
  const today = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', { weekday: 'long' });
</script>

<p>Today is {formatter.format(today)}</p>
```

You can also use this to control element attributes:

```hbs
<script>
  let name = 'Katherine Johnson';
  let src = 'https://i.imgur.com/MK3eW3As.jpg';
</script>

<h3>Amazing scientists</h3>

<img src={src} alt={name} />
```
