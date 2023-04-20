import { onBeforeMount, onMounted, onUnmounted } from 'vue';
import router from '@/router';


export default abstract class BaseSetupService<P> {
	props = {} as P;
	router = router;

	get route () {
		return this.router.currentRoute.value;
	}

	constructor (props?: P) {
		this.props = props ?? {} as P;

		onBeforeMount(() => {
			this.onBeforeMountAsync();
		});

		onMounted(() => {
			this.onMounted();
		});

		onUnmounted(() => {
			this.onUnmounted();
		});
	}

	protected async onBeforeMountAsync () {}
	protected onMounted () {}
	protected onUnmounted () {}
}
