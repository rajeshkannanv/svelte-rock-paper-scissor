(function (l, r) {
	if (l.getElementById('livereloadscript')) return;
	r = l.createElement('script');
	r.async = 1;
	r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1';
	r.id = 'livereloadscript';
	l.head.appendChild(r)
})(window.document);
var app = (function () {
	'use strict';

	function noop() {}
	const identity = x => x;

	function add_location(element, file, line, column, char) {
		element.__svelte_meta = {
			loc: {
				file,
				line,
				column,
				char
			}
		};
	}

	function run(fn) {
		return fn();
	}

	function blank_object() {
		return Object.create(null);
	}

	function run_all(fns) {
		fns.forEach(run);
	}

	function is_function(thing) {
		return typeof thing === 'function';
	}

	function safe_not_equal(a, b) {
		return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
	}

	const is_client = typeof window !== 'undefined';
	let now = is_client ?
		() => window.performance.now() :
		() => Date.now();
	let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

	const tasks = new Set();
	let running = false;

	function run_tasks() {
		tasks.forEach(task => {
			if (!task[0](now())) {
				tasks.delete(task);
				task[1]();
			}
		});
		running = tasks.size > 0;
		if (running)
			raf(run_tasks);
	}

	function loop(fn) {
		let task;
		if (!running) {
			running = true;
			raf(run_tasks);
		}
		return {
			promise: new Promise(fulfil => {
				tasks.add(task = [fn, fulfil]);
			}),
			abort() {
				tasks.delete(task);
			}
		};
	}

	function append(target, node) {
		target.appendChild(node);
	}

	function insert(target, node, anchor) {
		target.insertBefore(node, anchor || null);
	}

	function detach(node) {
		node.parentNode.removeChild(node);
	}

	function destroy_each(iterations, detaching) {
		for (let i = 0; i < iterations.length; i += 1) {
			if (iterations[i])
				iterations[i].d(detaching);
		}
	}

	function element(name) {
		return document.createElement(name);
	}

	function text(data) {
		return document.createTextNode(data);
	}

	function space() {
		return text(' ');
	}

	function empty() {
		return text('');
	}

	function listen(node, event, handler, options) {
		node.addEventListener(event, handler, options);
		return () => node.removeEventListener(event, handler, options);
	}

	function attr(node, attribute, value) {
		if (value == null)
			node.removeAttribute(attribute);
		else
			node.setAttribute(attribute, value);
	}

	function children(element) {
		return Array.from(element.childNodes);
	}

	function custom_event(type, detail) {
		const e = document.createEvent('CustomEvent');
		e.initCustomEvent(type, false, false, detail);
		return e;
	}

	let stylesheet;
	let active = 0;
	let current_rules = {};
	// https://github.com/darkskyapp/string-hash/blob/master/index.js
	function hash(str) {
		let hash = 5381;
		let i = str.length;
		while (i--)
			hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
		return hash >>> 0;
	}

	function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
		const step = 16.666 / duration;
		let keyframes = '{\n';
		for (let p = 0; p <= 1; p += step) {
			const t = a + (b - a) * ease(p);
			keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
		}
		const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
		const name = `__svelte_${hash(rule)}_${uid}`;
		if (!current_rules[name]) {
			if (!stylesheet) {
				const style = element('style');
				document.head.appendChild(style);
				stylesheet = style.sheet;
			}
			current_rules[name] = true;
			stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
		}
		const animation = node.style.animation || '';
		node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
		active += 1;
		return name;
	}

	function delete_rule(node, name) {
		node.style.animation = (node.style.animation || '')
			.split(', ')
			.filter(name ?
				anim => anim.indexOf(name) < 0 // remove specific animation
				:
				anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
			)
			.join(', ');
		if (name && !--active)
			clear_rules();
	}

	function clear_rules() {
		raf(() => {
			if (active)
				return;
			let i = stylesheet.cssRules.length;
			while (i--)
				stylesheet.deleteRule(i);
			current_rules = {};
		});
	}

	let current_component;

	function set_current_component(component) {
		current_component = component;
	}

	const dirty_components = [];
	const binding_callbacks = [];
	const render_callbacks = [];
	const flush_callbacks = [];
	const resolved_promise = Promise.resolve();
	let update_scheduled = false;

	function schedule_update() {
		if (!update_scheduled) {
			update_scheduled = true;
			resolved_promise.then(flush);
		}
	}

	function add_render_callback(fn) {
		render_callbacks.push(fn);
	}

	function flush() {
		const seen_callbacks = new Set();
		do {
			// first, call beforeUpdate functions
			// and update components
			while (dirty_components.length) {
				const component = dirty_components.shift();
				set_current_component(component);
				update(component.$$);
			}
			while (binding_callbacks.length)
				binding_callbacks.pop()();
			// then, once components are updated, call
			// afterUpdate functions. This may cause
			// subsequent updates...
			for (let i = 0; i < render_callbacks.length; i += 1) {
				const callback = render_callbacks[i];
				if (!seen_callbacks.has(callback)) {
					callback();
					// ...so guard against infinite loops
					seen_callbacks.add(callback);
				}
			}
			render_callbacks.length = 0;
		} while (dirty_components.length);
		while (flush_callbacks.length) {
			flush_callbacks.pop()();
		}
		update_scheduled = false;
	}

	function update($$) {
		if ($$.fragment) {
			$$.update($$.dirty);
			run_all($$.before_update);
			$$.fragment.p($$.dirty, $$.ctx);
			$$.dirty = null;
			$$.after_update.forEach(add_render_callback);
		}
	}

	let promise;

	function wait() {
		if (!promise) {
			promise = Promise.resolve();
			promise.then(() => {
				promise = null;
			});
		}
		return promise;
	}

	function dispatch(node, direction, kind) {
		node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
	}
	const outroing = new Set();
	let outros;

	function group_outros() {
		outros = {
			r: 0,
			c: [],
			p: outros // parent group
		};
	}

	function check_outros() {
		if (!outros.r) {
			run_all(outros.c);
		}
		outros = outros.p;
	}

	function transition_in(block, local) {
		if (block && block.i) {
			outroing.delete(block);
			block.i(local);
		}
	}

	function transition_out(block, local, detach, callback) {
		if (block && block.o) {
			if (outroing.has(block))
				return;
			outroing.add(block);
			outros.c.push(() => {
				outroing.delete(block);
				if (callback) {
					if (detach)
						block.d(1);
					callback();
				}
			});
			block.o(local);
		}
	}
	const null_transition = {
		duration: 0
	};

	function create_in_transition(node, fn, params) {
		let config = fn(node, params);
		let running = false;
		let animation_name;
		let task;
		let uid = 0;

		function cleanup() {
			if (animation_name)
				delete_rule(node, animation_name);
		}

		function go() {
			const {
				delay = 0, duration = 300, easing = identity, tick = noop, css
			} = config || null_transition;
			if (css)
				animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
			tick(0, 1);
			const start_time = now() + delay;
			const end_time = start_time + duration;
			if (task)
				task.abort();
			running = true;
			add_render_callback(() => dispatch(node, true, 'start'));
			task = loop(now => {
				if (running) {
					if (now >= end_time) {
						tick(1, 0);
						dispatch(node, true, 'end');
						cleanup();
						return running = false;
					}
					if (now >= start_time) {
						const t = easing((now - start_time) / duration);
						tick(t, 1 - t);
					}
				}
				return running;
			});
		}
		let started = false;
		return {
			start() {
				if (started)
					return;
				delete_rule(node);
				if (is_function(config)) {
					config = config();
					wait().then(go);
				} else {
					go();
				}
			},
			invalidate() {
				started = false;
			},
			end() {
				if (running) {
					cleanup();
					running = false;
				}
			}
		};
	}

	function create_out_transition(node, fn, params) {
		let config = fn(node, params);
		let running = true;
		let animation_name;
		const group = outros;
		group.r += 1;

		function go() {
			const {
				delay = 0, duration = 300, easing = identity, tick = noop, css
			} = config || null_transition;
			if (css)
				animation_name = create_rule(node, 1, 0, duration, delay, easing, css);
			const start_time = now() + delay;
			const end_time = start_time + duration;
			add_render_callback(() => dispatch(node, false, 'start'));
			loop(now => {
				if (running) {
					if (now >= end_time) {
						tick(0, 1);
						dispatch(node, false, 'end');
						if (!--group.r) {
							// this will result in `end()` being called,
							// so we don't need to clean up here
							run_all(group.c);
						}
						return false;
					}
					if (now >= start_time) {
						const t = easing((now - start_time) / duration);
						tick(1 - t, t);
					}
				}
				return running;
			});
		}
		if (is_function(config)) {
			wait().then(() => {
				// @ts-ignore
				config = config();
				go();
			});
		} else {
			go();
		}
		return {
			end(reset) {
				if (reset && config.tick) {
					config.tick(1, 0);
				}
				if (running) {
					if (animation_name)
						delete_rule(node, animation_name);
					running = false;
				}
			}
		};
	}

	function mount_component(component, target, anchor) {
		const {
			fragment,
			on_mount,
			on_destroy,
			after_update
		} = component.$$;
		fragment.m(target, anchor);
		// onMount happens before the initial afterUpdate
		add_render_callback(() => {
			const new_on_destroy = on_mount.map(run).filter(is_function);
			if (on_destroy) {
				on_destroy.push(...new_on_destroy);
			} else {
				// Edge case - component was destroyed immediately,
				// most likely as a result of a binding initialising
				run_all(new_on_destroy);
			}
			component.$$.on_mount = [];
		});
		after_update.forEach(add_render_callback);
	}

	function destroy_component(component, detaching) {
		if (component.$$.fragment) {
			run_all(component.$$.on_destroy);
			component.$$.fragment.d(detaching);
			// TODO null out other refs, including component.$$ (but need to
			// preserve final state?)
			component.$$.on_destroy = component.$$.fragment = null;
			component.$$.ctx = {};
		}
	}

	function make_dirty(component, key) {
		if (!component.$$.dirty) {
			dirty_components.push(component);
			schedule_update();
			component.$$.dirty = blank_object();
		}
		component.$$.dirty[key] = true;
	}

	function init(component, options, instance, create_fragment, not_equal, prop_names) {
		const parent_component = current_component;
		set_current_component(component);
		const props = options.props || {};
		const $$ = component.$$ = {
			fragment: null,
			ctx: null,
			// state
			props: prop_names,
			update: noop,
			not_equal,
			bound: blank_object(),
			// lifecycle
			on_mount: [],
			on_destroy: [],
			before_update: [],
			after_update: [],
			context: new Map(parent_component ? parent_component.$$.context : []),
			// everything else
			callbacks: blank_object(),
			dirty: null
		};
		let ready = false;
		$$.ctx = instance ?
			instance(component, props, (key, ret, value = ret) => {
				if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
					if ($$.bound[key])
						$$.bound[key](value);
					if (ready)
						make_dirty(component, key);
				}
				return ret;
			}) :
			props;
		$$.update();
		ready = true;
		run_all($$.before_update);
		$$.fragment = create_fragment($$.ctx);
		if (options.target) {
			if (options.hydrate) {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				$$.fragment.l(children(options.target));
			} else {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				$$.fragment.c();
			}
			if (options.intro)
				transition_in(component.$$.fragment);
			mount_component(component, options.target, options.anchor);
			flush();
		}
		set_current_component(parent_component);
	}
	class SvelteComponent {
		$destroy() {
			destroy_component(this, 1);
			this.$destroy = noop;
		}
		$on(type, callback) {
			const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
			callbacks.push(callback);
			return () => {
				const index = callbacks.indexOf(callback);
				if (index !== -1)
					callbacks.splice(index, 1);
			};
		}
		$set() {
			// overridden by instance, if it has props
		}
	}

	function dispatch_dev(type, detail) {
		document.dispatchEvent(custom_event(type, detail));
	}

	function append_dev(target, node) {
		dispatch_dev("SvelteDOMInsert", {
			target,
			node
		});
		append(target, node);
	}

	function insert_dev(target, node, anchor) {
		dispatch_dev("SvelteDOMInsert", {
			target,
			node,
			anchor
		});
		insert(target, node, anchor);
	}

	function detach_dev(node) {
		dispatch_dev("SvelteDOMRemove", {
			node
		});
		detach(node);
	}

	function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
		const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
		if (has_prevent_default)
			modifiers.push('preventDefault');
		if (has_stop_propagation)
			modifiers.push('stopPropagation');
		dispatch_dev("SvelteDOMAddEventListener", {
			node,
			event,
			handler,
			modifiers
		});
		const dispose = listen(node, event, handler, options);
		return () => {
			dispatch_dev("SvelteDOMRemoveEventListener", {
				node,
				event,
				handler,
				modifiers
			});
			dispose();
		};
	}

	function attr_dev(node, attribute, value) {
		attr(node, attribute, value);
		if (value == null)
			dispatch_dev("SvelteDOMRemoveAttribute", {
				node,
				attribute
			});
		else
			dispatch_dev("SvelteDOMSetAttribute", {
				node,
				attribute,
				value
			});
	}

	function set_data_dev(text, data) {
		data = '' + data;
		if (text.data === data)
			return;
		dispatch_dev("SvelteDOMSetData", {
			node: text,
			data
		});
		text.data = data;
	}
	class SvelteComponentDev extends SvelteComponent {
		constructor(options) {
			if (!options || (!options.target && !options.$$inline)) {
				throw new Error(`'target' is a required option`);
			}
			super();
		}
		$destroy() {
			super.$destroy();
			this.$destroy = () => {
				console.warn(`Component was already destroyed`); // eslint-disable-line no-console
			};
		}
	}

	/* src/components/Header.svelte generated by Svelte v3.12.1 */

	const file = "src/components/Header.svelte";

	function create_fragment(ctx) {
		var div2, div0, h1, t1, div1, span, t3, p, t4_value = ctx.score || '-' + "",
			t4;

		const block = {
			c: function create() {
				div2 = element("div");
				div0 = element("div");
				h1 = element("h1");
				h1.textContent = "Rock Paper Scissors";
				t1 = space();
				div1 = element("div");
				span = element("span");
				span.textContent = "Score";
				t3 = space();
				p = element("p");
				t4 = text(t4_value);
				add_location(h1, file, 81, 4, 1500);
				attr_dev(div0, "class", "header-game-name svelte-1x0r7s4");
				add_location(div0, file, 80, 2, 1465);
				attr_dev(span, "class", "svelte-1x0r7s4");
				add_location(span, file, 84, 4, 1576);
				attr_dev(p, "class", "svelte-1x0r7s4");
				add_location(p, file, 85, 4, 1599);
				attr_dev(div1, "class", "header-game-score svelte-1x0r7s4");
				add_location(div1, file, 83, 2, 1540);
				attr_dev(div2, "class", "header-game svelte-1x0r7s4");
				add_location(div2, file, 79, 0, 1437);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert_dev(target, div2, anchor);
				append_dev(div2, div0);
				append_dev(div0, h1);
				append_dev(div2, t1);
				append_dev(div2, div1);
				append_dev(div1, span);
				append_dev(div1, t3);
				append_dev(div1, p);
				append_dev(p, t4);
			},

			p: function update(changed, ctx) {
				if ((changed.score) && t4_value !== (t4_value = ctx.score || '-' + "")) {
					set_data_dev(t4, t4_value);
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div2);
				}
			}
		};
		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment.name,
			type: "component",
			source: "",
			ctx
		});
		return block;
	}

	function instance($$self, $$props, $$invalidate) {
		let {
			score
		} = $$props;

		const writable_props = ['score'];
		Object.keys($$props).forEach(key => {
			if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Header> was created with unknown prop '${key}'`);
		});

		$$self.$set = $$props => {
			if ('score' in $$props) $$invalidate('score', score = $$props.score);
		};

		$$self.$capture_state = () => {
			return {
				score
			};
		};

		$$self.$inject_state = $$props => {
			if ('score' in $$props) $$invalidate('score', score = $$props.score);
		};

		return {
			score
		};
	}

	class Header extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance, create_fragment, safe_not_equal, ["score"]);
			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Header",
				options,
				id: create_fragment.name
			});

			const {
				ctx
			} = this.$$;
			const props = options.props || {};
			if (ctx.score === undefined && !('score' in props)) {
				console.warn("<Header> was created without expected prop 'score'");
			}
		}

		get score() {
			throw new Error("<Header>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set score(value) {
			throw new Error("<Header>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src/components/Selectors.svelte generated by Svelte v3.12.1 */

	const file$1 = "src/components/Selectors.svelte";

	function get_each_context(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.name = list[i];
		return child_ctx;
	}

	// (56:2) {#each selectors as name}
	function create_each_block(ctx) {
		var button, span, img, img_src_value, img_alt_value, t, button_class_value, dispose;

		function click_handler() {
			return ctx.click_handler(ctx);
		}

		const block = {
			c: function create() {
				button = element("button");
				span = element("span");
				img = element("img");
				t = space();
				attr_dev(img, "src", img_src_value = "./public/img/icon-" + ctx.name + ".svg");
				attr_dev(img, "alt", img_alt_value = ctx.name);
				add_location(img, file$1, 58, 8, 1093);
				attr_dev(span, "class", "svelte-163hjgh");
				add_location(span, file$1, 57, 6, 1078);
				attr_dev(button, "class", button_class_value = "buttons button-" + ctx.name + " svelte-163hjgh");
				add_location(button, file$1, 56, 4, 1002);
				dispose = listen_dev(button, "click", click_handler);
			},

			m: function mount(target, anchor) {
				insert_dev(target, button, anchor);
				append_dev(button, span);
				append_dev(span, img);
				append_dev(button, t);
			},

			p: function update(changed, new_ctx) {
				ctx = new_ctx;
				if ((changed.selectors) && img_src_value !== (img_src_value = "./public/img/icon-" + ctx.name + ".svg")) {
					attr_dev(img, "src", img_src_value);
				}

				if ((changed.selectors) && img_alt_value !== (img_alt_value = ctx.name)) {
					attr_dev(img, "alt", img_alt_value);
				}

				if ((changed.selectors) && button_class_value !== (button_class_value = "buttons button-" + ctx.name + " svelte-163hjgh")) {
					attr_dev(button, "class", button_class_value);
				}
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(button);
				}

				dispose();
			}
		};
		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block.name,
			type: "each",
			source: "(56:2) {#each selectors as name}",
			ctx
		});
		return block;
	}

	function create_fragment$1(ctx) {
		var div;

		let each_value = ctx.selectors;

		let each_blocks = [];

		for (let i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
		}

		const block = {
			c: function create() {
				div = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}
				attr_dev(div, "class", "choice svelte-163hjgh");
				add_location(div, file$1, 54, 0, 949);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(div, null);
				}
			},

			p: function update(changed, ctx) {
				if (changed.selectors) {
					each_value = ctx.selectors;

					let i;
					for (i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
						} else {
							each_blocks[i] = create_each_block(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}
					each_blocks.length = each_value.length;
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}

				destroy_each(each_blocks, detaching);
			}
		};
		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$1.name,
			type: "component",
			source: "",
			ctx
		});
		return block;
	}

	function instance$1($$self, $$props, $$invalidate) {
		let {
			onclick,
			selectors = [],
			visible
		} = $$props;

		const writable_props = ['onclick', 'selectors', 'visible'];
		Object.keys($$props).forEach(key => {
			if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Selectors> was created with unknown prop '${key}'`);
		});

		const click_handler = ({
			name
		}) => onclick(name);

		$$self.$set = $$props => {
			if ('onclick' in $$props) $$invalidate('onclick', onclick = $$props.onclick);
			if ('selectors' in $$props) $$invalidate('selectors', selectors = $$props.selectors);
			if ('visible' in $$props) $$invalidate('visible', visible = $$props.visible);
		};

		$$self.$capture_state = () => {
			return {
				onclick,
				selectors,
				visible
			};
		};

		$$self.$inject_state = $$props => {
			if ('onclick' in $$props) $$invalidate('onclick', onclick = $$props.onclick);
			if ('selectors' in $$props) $$invalidate('selectors', selectors = $$props.selectors);
			if ('visible' in $$props) $$invalidate('visible', visible = $$props.visible);
		};

		return {
			onclick,
			selectors,
			visible,
			click_handler
		};
	}

	class Selectors extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$1, create_fragment$1, safe_not_equal, ["onclick", "selectors", "visible"]);
			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Selectors",
				options,
				id: create_fragment$1.name
			});

			const {
				ctx
			} = this.$$;
			const props = options.props || {};
			if (ctx.onclick === undefined && !('onclick' in props)) {
				console.warn("<Selectors> was created without expected prop 'onclick'");
			}
			if (ctx.visible === undefined && !('visible' in props)) {
				console.warn("<Selectors> was created without expected prop 'visible'");
			}
		}

		get onclick() {
			throw new Error("<Selectors>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set onclick(value) {
			throw new Error("<Selectors>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get selectors() {
			throw new Error("<Selectors>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set selectors(value) {
			throw new Error("<Selectors>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get visible() {
			throw new Error("<Selectors>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set visible(value) {
			throw new Error("<Selectors>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src/components/Result.svelte generated by Svelte v3.12.1 */

	const file$2 = "src/components/Result.svelte";

	// (122:2) {#if resultMessage}
	function create_if_block(ctx) {
		var div, span, t0, t1, button, dispose;

		const block = {
			c: function create() {
				div = element("div");
				span = element("span");
				t0 = text(ctx.resultMessage);
				t1 = space();
				button = element("button");
				button.textContent = "Play again";
				attr_dev(span, "id", "resultText");
				attr_dev(span, "class", "svelte-1vdvls4");
				add_location(span, file$2, 123, 6, 2197);
				attr_dev(button, "id", "playagain");
				attr_dev(button, "class", "svelte-1vdvls4");
				add_location(button, file$2, 124, 6, 2248);
				attr_dev(div, "class", "result svelte-1vdvls4");
				add_location(div, file$2, 122, 4, 2170);
				dispose = listen_dev(button, "click", ctx.onPlayagain);
			},

			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				append_dev(div, span);
				append_dev(span, t0);
				append_dev(div, t1);
				append_dev(div, button);
			},

			p: function update(changed, ctx) {
				if (changed.resultMessage) {
					set_data_dev(t0, ctx.resultMessage);
				}
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}

				dispose();
			}
		};
		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block.name,
			type: "if",
			source: "(122:2) {#if resultMessage}",
			ctx
		});
		return block;
	}

	function create_fragment$2(ctx) {
		var div6, div2, p0, t1, div1, div0, img0, img0_src_value, div1_class_value, t2, t3, div5, p1, t5, div4, div3, img1, img1_src_value, div4_class_value;

		var if_block = (ctx.resultMessage) && create_if_block(ctx);

		const block = {
			c: function create() {
				div6 = element("div");
				div2 = element("div");
				p0 = element("p");
				p0.textContent = "You picked";
				t1 = space();
				div1 = element("div");
				div0 = element("div");
				img0 = element("img");
				t2 = space();
				if (if_block) if_block.c();
				t3 = space();
				div5 = element("div");
				p1 = element("p");
				p1.textContent = "The Machine picked";
				t5 = space();
				div4 = element("div");
				div3 = element("div");
				img1 = element("img");
				attr_dev(p0, "class", "svelte-1vdvls4");
				add_location(p0, file$2, 114, 4, 1954);
				attr_dev(img0, "src", img0_src_value = "./public/img/icon-" + ctx.userPicked + ".svg");
				attr_dev(img0, "alt", ctx.userPicked);
				attr_dev(img0, "class", "svelte-1vdvls4");
				add_location(img0, file$2, 117, 8, 2052);
				attr_dev(div0, "class", "circle svelte-1vdvls4");
				add_location(div0, file$2, 116, 6, 2023);
				attr_dev(div1, "class", div1_class_value = "picked button-" + ctx.userPicked + " svelte-1vdvls4");
				add_location(div1, file$2, 115, 4, 1976);
				attr_dev(div2, "class", "svelte-1vdvls4");
				add_location(div2, file$2, 113, 2, 1944);
				attr_dev(p1, "class", "svelte-1vdvls4");
				add_location(p1, file$2, 128, 4, 2345);
				attr_dev(img1, "src", img1_src_value = "./public/img/icon-" + ctx.machinePicked + ".svg");
				attr_dev(img1, "alt", ctx.machinePicked);
				attr_dev(img1, "class", "svelte-1vdvls4");
				add_location(img1, file$2, 131, 8, 2454);
				attr_dev(div3, "class", "circle svelte-1vdvls4");
				add_location(div3, file$2, 130, 6, 2425);
				attr_dev(div4, "class", div4_class_value = "picked button-" + ctx.machinePicked + " svelte-1vdvls4");
				add_location(div4, file$2, 129, 4, 2375);
				attr_dev(div5, "class", "svelte-1vdvls4");
				add_location(div5, file$2, 127, 2, 2335);
				attr_dev(div6, "class", "game svelte-1vdvls4");
				add_location(div6, file$2, 112, 0, 1923);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert_dev(target, div6, anchor);
				append_dev(div6, div2);
				append_dev(div2, p0);
				append_dev(div2, t1);
				append_dev(div2, div1);
				append_dev(div1, div0);
				append_dev(div0, img0);
				append_dev(div6, t2);
				if (if_block) if_block.m(div6, null);
				append_dev(div6, t3);
				append_dev(div6, div5);
				append_dev(div5, p1);
				append_dev(div5, t5);
				append_dev(div5, div4);
				append_dev(div4, div3);
				append_dev(div3, img1);
			},

			p: function update(changed, ctx) {
				if ((changed.userPicked) && img0_src_value !== (img0_src_value = "./public/img/icon-" + ctx.userPicked + ".svg")) {
					attr_dev(img0, "src", img0_src_value);
				}

				if (changed.userPicked) {
					attr_dev(img0, "alt", ctx.userPicked);
				}

				if ((changed.userPicked) && div1_class_value !== (div1_class_value = "picked button-" + ctx.userPicked + " svelte-1vdvls4")) {
					attr_dev(div1, "class", div1_class_value);
				}

				if (ctx.resultMessage) {
					if (if_block) {
						if_block.p(changed, ctx);
					} else {
						if_block = create_if_block(ctx);
						if_block.c();
						if_block.m(div6, t3);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}

				if ((changed.machinePicked) && img1_src_value !== (img1_src_value = "./public/img/icon-" + ctx.machinePicked + ".svg")) {
					attr_dev(img1, "src", img1_src_value);
				}

				if (changed.machinePicked) {
					attr_dev(img1, "alt", ctx.machinePicked);
				}

				if ((changed.machinePicked) && div4_class_value !== (div4_class_value = "picked button-" + ctx.machinePicked + " svelte-1vdvls4")) {
					attr_dev(div4, "class", div4_class_value);
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div6);
				}

				if (if_block) if_block.d();
			}
		};
		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$2.name,
			type: "component",
			source: "",
			ctx
		});
		return block;
	}

	function instance$2($$self, $$props, $$invalidate) {
		let {
			userPicked = "", machinePicked = "", resultMessage, onPlayagain, visible
		} = $$props;

		const writable_props = ['userPicked', 'machinePicked', 'resultMessage', 'onPlayagain', 'visible'];
		Object.keys($$props).forEach(key => {
			if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Result> was created with unknown prop '${key}'`);
		});

		$$self.$set = $$props => {
			if ('userPicked' in $$props) $$invalidate('userPicked', userPicked = $$props.userPicked);
			if ('machinePicked' in $$props) $$invalidate('machinePicked', machinePicked = $$props.machinePicked);
			if ('resultMessage' in $$props) $$invalidate('resultMessage', resultMessage = $$props.resultMessage);
			if ('onPlayagain' in $$props) $$invalidate('onPlayagain', onPlayagain = $$props.onPlayagain);
			if ('visible' in $$props) $$invalidate('visible', visible = $$props.visible);
		};

		$$self.$capture_state = () => {
			return {
				userPicked,
				machinePicked,
				resultMessage,
				onPlayagain,
				visible
			};
		};

		$$self.$inject_state = $$props => {
			if ('userPicked' in $$props) $$invalidate('userPicked', userPicked = $$props.userPicked);
			if ('machinePicked' in $$props) $$invalidate('machinePicked', machinePicked = $$props.machinePicked);
			if ('resultMessage' in $$props) $$invalidate('resultMessage', resultMessage = $$props.resultMessage);
			if ('onPlayagain' in $$props) $$invalidate('onPlayagain', onPlayagain = $$props.onPlayagain);
			if ('visible' in $$props) $$invalidate('visible', visible = $$props.visible);
		};

		return {
			userPicked,
			machinePicked,
			resultMessage,
			onPlayagain,
			visible
		};
	}

	class Result extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$2, create_fragment$2, safe_not_equal, ["userPicked", "machinePicked", "resultMessage", "onPlayagain", "visible"]);
			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Result",
				options,
				id: create_fragment$2.name
			});

			const {
				ctx
			} = this.$$;
			const props = options.props || {};
			if (ctx.resultMessage === undefined && !('resultMessage' in props)) {
				console.warn("<Result> was created without expected prop 'resultMessage'");
			}
			if (ctx.onPlayagain === undefined && !('onPlayagain' in props)) {
				console.warn("<Result> was created without expected prop 'onPlayagain'");
			}
			if (ctx.visible === undefined && !('visible' in props)) {
				console.warn("<Result> was created without expected prop 'visible'");
			}
		}

		get userPicked() {
			throw new Error("<Result>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set userPicked(value) {
			throw new Error("<Result>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get machinePicked() {
			throw new Error("<Result>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set machinePicked(value) {
			throw new Error("<Result>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get resultMessage() {
			throw new Error("<Result>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set resultMessage(value) {
			throw new Error("<Result>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get onPlayagain() {
			throw new Error("<Result>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set onPlayagain(value) {
			throw new Error("<Result>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get visible() {
			throw new Error("<Result>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set visible(value) {
			throw new Error("<Result>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	function cubicOut(t) {
		const f = t - 1.0;
		return f * f * f + 1.0;
	}

	function fly(node, {
		delay = 0,
		duration = 400,
		easing = cubicOut,
		x = 0,
		y = 0,
		opacity = 0
	}) {
		const style = getComputedStyle(node);
		const target_opacity = +style.opacity;
		const transform = style.transform === 'none' ? '' : style.transform;
		const od = target_opacity * (1 - opacity);
		return {
			delay,
			duration,
			easing,
			css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * x}px, ${(1 - t) * y}px);
			opacity: ${target_opacity - (od * u)}`
		};
	}

	/* src/components/Rules.svelte generated by Svelte v3.12.1 */

	const file$3 = "src/components/Rules.svelte";

	// (105:0) {#if isRuleOpen}
	function create_if_block$1(ctx) {
		var div3, div2, div0, span, t1, button, img0, t2, div1, img1, div3_intro, div3_outro, current, dispose;

		const block = {
			c: function create() {
				div3 = element("div");
				div2 = element("div");
				div0 = element("div");
				span = element("span");
				span.textContent = "Rules";
				t1 = space();
				button = element("button");
				img0 = element("img");
				t2 = space();
				div1 = element("div");
				img1 = element("img");
				attr_dev(span, "class", "svelte-1rxhem0");
				add_location(span, file$3, 108, 8, 1770);
				attr_dev(img0, "src", "./public/img/icon-close.svg");
				attr_dev(img0, "alt", "close");
				attr_dev(img0, "class", "svelte-1rxhem0");
				add_location(img0, file$3, 110, 10, 1835);
				attr_dev(button, "class", "svelte-1rxhem0");
				add_location(button, file$3, 109, 8, 1797);
				attr_dev(div0, "class", "svelte-1rxhem0");
				add_location(div0, file$3, 107, 6, 1756);
				attr_dev(img1, "src", "./public/img/image-rules.svg");
				attr_dev(img1, "alt", "rules");
				attr_dev(img1, "class", "svelte-1rxhem0");
				add_location(img1, file$3, 114, 8, 1933);
				attr_dev(div1, "class", "svelte-1rxhem0");
				add_location(div1, file$3, 113, 6, 1919);
				attr_dev(div2, "class", "modal svelte-1rxhem0");
				add_location(div2, file$3, 106, 4, 1730);
				attr_dev(div3, "class", "rules svelte-1rxhem0");
				add_location(div3, file$3, 105, 2, 1691);
				dispose = listen_dev(button, "click", ctx.onClose);
			},

			m: function mount(target, anchor) {
				insert_dev(target, div3, anchor);
				append_dev(div3, div2);
				append_dev(div2, div0);
				append_dev(div0, span);
				append_dev(div0, t1);
				append_dev(div0, button);
				append_dev(button, img0);
				append_dev(div2, t2);
				append_dev(div2, div1);
				append_dev(div1, img1);
				current = true;
			},

			i: function intro(local) {
				if (current) return;
				add_render_callback(() => {
					if (div3_outro) div3_outro.end(1);
					if (!div3_intro) div3_intro = create_in_transition(div3, fly, {});
					div3_intro.start();
				});

				current = true;
			},

			o: function outro(local) {
				if (div3_intro) div3_intro.invalidate();

				div3_outro = create_out_transition(div3, fly, {});

				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div3);
					if (div3_outro) div3_outro.end();
				}

				dispose();
			}
		};
		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$1.name,
			type: "if",
			source: "(105:0) {#if isRuleOpen}",
			ctx
		});
		return block;
	}

	function create_fragment$3(ctx) {
		var div, button, t_1, if_block_anchor, current, dispose;

		var if_block = (ctx.isRuleOpen) && create_if_block$1(ctx);

		const block = {
			c: function create() {
				div = element("div");
				button = element("button");
				button.textContent = "rules";
				t_1 = space();
				if (if_block) if_block.c();
				if_block_anchor = empty();
				attr_dev(button, "class", "button-rules svelte-1rxhem0");
				add_location(button, file$3, 101, 2, 1598);
				attr_dev(div, "class", "svelte-1rxhem0");
				add_location(div, file$3, 100, 0, 1590);
				dispose = listen_dev(button, "click", ctx.onRuleOpen);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				append_dev(div, button);
				insert_dev(target, t_1, anchor);
				if (if_block) if_block.m(target, anchor);
				insert_dev(target, if_block_anchor, anchor);
				current = true;
			},

			p: function update(changed, ctx) {
				if (ctx.isRuleOpen) {
					if (!if_block) {
						if_block = create_if_block$1(ctx);
						if_block.c();
						transition_in(if_block, 1);
						if_block.m(if_block_anchor.parentNode, if_block_anchor);
					} else transition_in(if_block, 1);
				} else if (if_block) {
					group_outros();
					transition_out(if_block, 1, 1, () => {
						if_block = null;
					});
					check_outros();
				}
			},

			i: function intro(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},

			o: function outro(local) {
				transition_out(if_block);
				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
					detach_dev(t_1);
				}

				if (if_block) if_block.d(detaching);

				if (detaching) {
					detach_dev(if_block_anchor);
				}

				dispose();
			}
		};
		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$3.name,
			type: "component",
			source: "",
			ctx
		});
		return block;
	}

	function instance$3($$self, $$props, $$invalidate) {
		let isRuleOpen = false;

		function onRuleOpen() {
			$$invalidate('isRuleOpen', isRuleOpen = true);
		}

		function onClose() {
			$$invalidate('isRuleOpen', isRuleOpen = false);
		}

		$$self.$capture_state = () => {
			return {};
		};

		$$self.$inject_state = $$props => {
			if ('isRuleOpen' in $$props) $$invalidate('isRuleOpen', isRuleOpen = $$props.isRuleOpen);
		};

		return {
			isRuleOpen,
			onRuleOpen,
			onClose
		};
	}

	class Rules extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$3, create_fragment$3, safe_not_equal, []);
			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Rules",
				options,
				id: create_fragment$3.name
			});
		}
	}

	/* src/App.svelte generated by Svelte v3.12.1 */

	const file$4 = "src/App.svelte";

	// (61:2) {:else}
	function create_else_block(ctx) {
		var current;

		var selector = new Selectors({
			props: {
				selectors: ctx.selectors,
				onclick: ctx.onclick
			},
			$$inline: true
		});

		const block = {
			c: function create() {
				selector.$$.fragment.c();
			},

			m: function mount(target, anchor) {
				mount_component(selector, target, anchor);
				current = true;
			},

			p: noop,

			i: function intro(local) {
				if (current) return;
				transition_in(selector.$$.fragment, local);

				current = true;
			},

			o: function outro(local) {
				transition_out(selector.$$.fragment, local);
				current = false;
			},

			d: function destroy(detaching) {
				destroy_component(selector, detaching);
			}
		};
		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block.name,
			type: "else",
			source: "(61:2) {:else}",
			ctx
		});
		return block;
	}

	// (59:2) {#if userPicked}
	function create_if_block$2(ctx) {
		var current;

		var result = new Result({
			props: {
				userPicked: ctx.userPicked,
				machinePicked: ctx.machinePicked,
				resultMessage: ctx.resultMessage,
				onPlayagain: ctx.onPlayagain
			},
			$$inline: true
		});

		const block = {
			c: function create() {
				result.$$.fragment.c();
			},

			m: function mount(target, anchor) {
				mount_component(result, target, anchor);
				current = true;
			},

			p: function update(changed, ctx) {
				var result_changes = {};
				if (changed.userPicked) result_changes.userPicked = ctx.userPicked;
				if (changed.machinePicked) result_changes.machinePicked = ctx.machinePicked;
				if (changed.resultMessage) result_changes.resultMessage = ctx.resultMessage;
				result.$set(result_changes);
			},

			i: function intro(local) {
				if (current) return;
				transition_in(result.$$.fragment, local);

				current = true;
			},

			o: function outro(local) {
				transition_out(result.$$.fragment, local);
				current = false;
			},

			d: function destroy(detaching) {
				destroy_component(result, detaching);
			}
		};
		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$2.name,
			type: "if",
			source: "(59:2) {#if userPicked}",
			ctx
		});
		return block;
	}

	function create_fragment$4(ctx) {
		var div, t0, current_block_type_index, if_block, t1, current;

		var header = new Header({
			props: {
				score: ctx.score
			},
			$$inline: true
		});

		var if_block_creators = [
			create_if_block$2,
			create_else_block
		];

		var if_blocks = [];

		function select_block_type(changed, ctx) {
			if (ctx.userPicked) return 0;
			return 1;
		}

		current_block_type_index = select_block_type(null, ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		var rules_1 = new Rules({
			$$inline: true
		});

		const block = {
			c: function create() {
				div = element("div");
				header.$$.fragment.c();
				t0 = space();
				if_block.c();
				t1 = space();
				rules_1.$$.fragment.c();
				attr_dev(div, "class", "container");
				add_location(div, file$4, 56, 0, 1370);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				mount_component(header, div, null);
				append_dev(div, t0);
				if_blocks[current_block_type_index].m(div, null);
				append_dev(div, t1);
				mount_component(rules_1, div, null);
				current = true;
			},

			p: function update(changed, ctx) {
				var header_changes = {};
				if (changed.score) header_changes.score = ctx.score;
				header.$set(header_changes);

				var previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(changed, ctx);
				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(changed, ctx);
				} else {
					group_outros();
					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});
					check_outros();

					if_block = if_blocks[current_block_type_index];
					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					}
					transition_in(if_block, 1);
					if_block.m(div, t1);
				}
			},

			i: function intro(local) {
				if (current) return;
				transition_in(header.$$.fragment, local);

				transition_in(if_block);

				transition_in(rules_1.$$.fragment, local);

				current = true;
			},

			o: function outro(local) {
				transition_out(header.$$.fragment, local);
				transition_out(if_block);
				transition_out(rules_1.$$.fragment, local);
				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}

				destroy_component(header);

				if_blocks[current_block_type_index].d();

				destroy_component(rules_1);
			}
		};
		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$4.name,
			type: "component",
			source: "",
			ctx
		});
		return block;
	}

	function instance$4($$self, $$props, $$invalidate) {


		let score = 0;
		let selectors = ["rock", "paper", "scissors"];
		let machinePicked;
		let userPicked;
		let resultMessage;

		function aleatory() {
			return selectors[Math.floor(Math.random() * selectors.length)];
		}

		function roulette() {
			$$invalidate('machinePicked', machinePicked = aleatory());
		}

		function rules(nameChoisen, result) {
			const myNumber = selectors.findIndex(name => name === nameChoisen);
			const machineNumber = selectors.findIndex(name => name === result);
			let message = "";
			if (myNumber == machineNumber) {
				message = "You Tie";
			} else if (
				(myNumber - machineNumber) % 3 == 1 ||
				(myNumber - machineNumber) % 3 == -2
			) {
				message = "You win";
				$$invalidate('score', score++, score);
			} else {
				message = "You lose";
			}

			return message;
		}

		function onclick(name) {
			$$invalidate('userPicked', userPicked = name);
			roulette();
			const startRoulette = setInterval(roulette, 200);
			setTimeout(() => {
				clearInterval(startRoulette);
				$$invalidate('resultMessage', resultMessage = rules(userPicked, machinePicked));
			}, 1400);
		}

		function onPlayagain() {
			$$invalidate('userPicked', userPicked = null);
			$$invalidate('machinePicked', machinePicked = null);
			$$invalidate('resultMessage', resultMessage = null);
		}

		$$self.$capture_state = () => {
			return {};
		};

		$$self.$inject_state = $$props => {
			if ('score' in $$props) $$invalidate('score', score = $$props.score);
			if ('selectors' in $$props) $$invalidate('selectors', selectors = $$props.selectors);
			if ('machinePicked' in $$props) $$invalidate('machinePicked', machinePicked = $$props.machinePicked);
			if ('userPicked' in $$props) $$invalidate('userPicked', userPicked = $$props.userPicked);
			if ('resultMessage' in $$props) $$invalidate('resultMessage', resultMessage = $$props.resultMessage);
		};

		return {
			score,
			selectors,
			machinePicked,
			userPicked,
			resultMessage,
			onclick,
			onPlayagain
		};
	}

	class App extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$4, create_fragment$4, safe_not_equal, []);
			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "App",
				options,
				id: create_fragment$4.name
			});
		}
	}

	const app = new App({
		target: document.body,
	});

	return app;

}());
//# sourceMappingURL=bundle.js.map