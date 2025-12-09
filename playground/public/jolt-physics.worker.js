if (
	typeof WorkerGlobalScope !== "undefined" &&
	self instanceof WorkerGlobalScope
) {
	console.debug("Loaded Jolt worker in worker thread.");
} else {
	console.debug("Loaded Jolt worker in main thread.");
}

const onWorker = async (Jolt, args) => {
	const { contactListenerPtr } = args;
	const contactListener = Jolt.wrapPointer(
		contactListenerPtr,
		Jolt.ContactListenerJS,
	);
	contactListener.OnContactAdded = (...args) => {
		console.log(args);
	};
	contactListener.OnContactPersisted = (body1, body2, manifold, settings) => {};
	contactListener.OnContactRemoved = (subShapePair) => {};
	contactListener.OnContactValidate = (
		body1,
		body2,
		baseOffset,
		collideShapeResult,
	) => {
		return Jolt.ValidateResult_AcceptAllContactsForThisBodyPair;
	};
};

globalThis.onWorker = onWorker;

export default onWorker;
