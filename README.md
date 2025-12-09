<div align="center">

<br />

![elysiatech](/assets/banner.jpg)

<h1>elysia/engine</h3>

#### game engine for the web

*This is the source for Elysia Engine, an Actor/Component game engine built on top of Three.js.*

</div>

> 🚧👷 **Warning** Proceed at your own risk. This is an in-development engine, which is another way of saying that it will change _quite a lot_. We do our best to keep release branches stable, but expect a lot of breaking changes and things that are not perfect (yet!).

# Installation

Game engines benefit from source code access, so it's recommended to clone the repository as a submodule or vendor the compiled source from /lib.
If you are using a build system that can transform Typescript and Javascript decorators you can import the source directly. If not, compiled version
are available in the /lib directory, one targeting ES2020, one targeting ESNext, and one that is entirely bundled for direct use in the browser.

If you choose to use the source code directly with Vite, you will need to add the following to your vite config:

```javascript
export default defineConfig({
  ...,
  esbuild: { target: "es2022" }
});
```
Otherwise, ensure that experimental decorators are disabled in your Typescript configuration and that the decorators are transformed in your build pipeline.

# Overview

> If you're good at just digging examples and figuring things out, you can check out the playground and it's demo scenes. 
These are the best way to get a feel for how the engine works and what it can do.

The core gameplay unit in Elysia is the `Actor`, an object that participates in the lifecycle of the engine and is backed by an underlying instance of a
`Three.Object3d` that is managed by the engine. Actors can include other Actors as components, which can in turn include other Actors forming a s_Scene graph.
`Behaviors` can also be added to Actors as components, which are logic-only components that can be used to add functionality to Actors without participating
in the `Three` universe.

If you are familiar with Unity and Unreal engine, you will find that the Actor/Component model is very similar to the GameObject / Actor / Component model in those engines.
Actors are similar to Actors in Unreal, and behaviors are similar to MonoBehavior's in Unity. Since Elysia is built on top of Three.js, the underlying Three.js object
backing the Actor is available at `Actor.s_Object3D`, and it's possible to directly manipulate the s_Object3D if necessary for integrating other libraries and complex effects.

The `Scene` is the top-level container for actors, which is loaded by the `Application` class, the entry point for the engine which is responsible for managing lifecycle.

### Lifecycle

![lifecycle](/assets/lifecycle.png)

### License

Made with 💛

Published under [MIT License](./LICENSE).