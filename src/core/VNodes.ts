import {
	isArray,
	isInvalid,
	isNull,
	isNullOrUndef,
	isStatefulComponent,
	isUndefined
} from '../shared';
import {
	normalize
} from './normalization';
import options from './options';

export function createVNode(
	flags: VNodeFlags,
	type?: Type,
	props?: Props,
	children?: InfernoChildren,
	events?,
	key?: Key,
	ref?: Ref,
	noNormalise?: boolean
): VNode {
	if (flags & VNodeFlags.ComponentUnknown) {
		flags = isStatefulComponent(type) ? VNodeFlags.ComponentClass : VNodeFlags.ComponentFunction;
	}
	const vNode: VNode = {
		children: isUndefined(children) ? null : children,
		dom: null,
		events: events || null,
		flags,
		key: isUndefined(key) ? null : key,
		props: props || null,
		ref: ref || null,
		type
	};
	if (!noNormalise) {
		normalize(vNode);
	}
	if (options.createVNode) {
		options.createVNode(vNode);
	}
	return vNode;
}

export function cloneVNode(vNodeToClone: VNode, props?: Props, ..._children: InfernoChildren[]): VNode {
	let children: any = _children;

	if (_children.length > 0 && !isNull(_children[0])) {
		if (!props) {
			props = {};
		}
		if (_children.length === 1) {
			children = _children[0];
		}
		if (isUndefined(props.children)) {
			props.children = children as VNode;
		} else {
			if (isArray(children)) {
				if (isArray(props.children)) {
					props.children = props.children.concat(children) as any;
				} else {
					props.children = [props.children].concat(children) as any;
				}
			} else {
				if (isArray(props.children)) {
					props.children.push(children);
				} else {
					props.children = [props.children] as any;
					(props.children as any[]).push(children);
				}
			}
		}
	}
	children = null;
	let newVNode;

	if (isArray(vNodeToClone)) {
		const tmpArray = [];
		for (let i = 0; i < vNodeToClone.length; i++) {
			tmpArray.push(cloneVNode(vNodeToClone[i]));
		}

		newVNode = tmpArray;
	} else {
		const flags = vNodeToClone.flags;
		const events = vNodeToClone.events || (props && props.events) || null;
		const key = !isNullOrUndef(vNodeToClone.key) ? vNodeToClone.key : (props ? props.key : null);
		const ref = vNodeToClone.ref || (props ? props.ref : null);

		if (flags & VNodeFlags.Component) {
			newVNode = createVNode(flags, vNodeToClone.type,
				Object.assign({}, vNodeToClone.props, props),
				null,
				events,
				key,
				ref,
				true
			);
			const newProps = newVNode.props;

			if (newProps) {
				const newChildren = newProps.children;
				// we need to also clone component children that are in props
				// as the children may also have been hoisted
				if (newChildren) {
					if (isArray(newChildren)) {
						for (let i = 0; i < newChildren.length; i++) {
							const child = newChildren[i];

							if (!isInvalid(child) && isVNode(child)) {
								newProps.children[i] = cloneVNode(child);
							}
						}
					} else if (isVNode(newChildren)) {
						newProps.children = cloneVNode(newChildren);
					}
				}
			}
			newVNode.children = null;
		} else if (flags & VNodeFlags.Element) {
			children = (props && props.children) || vNodeToClone.children;
			newVNode = createVNode(flags, vNodeToClone.type,
				Object.assign({}, vNodeToClone.props, props),
				children,
				events,
				key,
				ref,
				!children
			);
		} else if (flags & VNodeFlags.Text) {
			newVNode = createTextVNode(vNodeToClone.children as string);
		}
	}

	return newVNode;
}

export function createVoidVNode(): VNode {
	return createVNode(VNodeFlags.Void);
}

export function createTextVNode(text: string | number): VNode {
	return createVNode(VNodeFlags.Text, null, null, text, null, null, null, true);
}

export function isVNode(o: VNode): boolean {
	return !!o.flags;
}
