import { action } from '@storybook/addon-actions';
import { linkTo } from '@storybook/addon-links';

import MyButton from './MyButton.vue';
import ViewEditText from '../renderer/components/Common/ViewEditText.vue'

export default {
  title: 'Button',
  component: MyButton,
};

export const Text = () => ({
  components: { MyButton },
  template: '<my-button @click="action">Hello Button</my-button>',
  methods: { action: action('clicked') },
});

export const ViewText = () => ({
  components: { MyButton },
  template: '<view-edit-text :value="project" font-size="1.5em" font-weight="bold" label="Project Name" justify="center"/>',
  methods: { action: action('clicked') },
});

export const Jsx = () => ({
  components: { MyButton },
  render() {
    return <my-button onClick={this.action}>With JSX</my-button>;
  },
  methods: { action: linkTo('clicked') },
});

export const Emoji = () => ({
  components: { MyButton },
  template:
    '<my-button @click="action"><span role="img" aria-label="so cool">😀 😎 👍 💯</span></my-button>',
  methods: { action: action('clicked') },
});
