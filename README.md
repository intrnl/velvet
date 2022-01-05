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
import { ref, access, html, clone, traverse, text, on, append, define } from '@intrnl/velvet/internal';

let template0 = html('<button> Clicked <!> times </button>');

function setup ($$root, $$host) {
  let count = ref(0);

  function increment () {
    count(count(access) + 1);
  }

  let fragment0 = clone(template0);

  let marker0 = traverse(fragment0, [0, 1]);
  text(marker0, () => count(access));

  let child0 = traverse(fragment0, [0]);
  on(child0, 'click', increment);

  append($$root, fragment0);
}

export default define('x-app', setup, {});
```

## Credits

- [Svelte](https://github.com/sveltejs/svelte)  
  It's pretty much what inspired this project's quest of trying to be small, while also trying to be
  highly efficient with mutations. Logic templating is also taken from it, as it makes for an easier
  transition.
