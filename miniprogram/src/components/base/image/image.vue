<template>
  <image
    :style="{
      height: safeHeight * 2 + 'rpx',
      width: safeWidth * 2 + 'rpx',
      dispay: 'block',
    }"
    :src="unoss ? src : imageCenterCrop(src, safeWidth, safeHeight, qulity)"
    :mode="mode"
  ></image>
</template>
<script lang="ts">
import Vue from "vue";
import { imageCenterCrop } from "@/utils/common";
export default Vue.extend({
  props: {
    src: {
      type: String,
      default: "",
    },
    // 允许透传数字或字符串，父组件的值在响应式更新中途可能短暂不是 Number，
    // 这里统一兜底转换，避免控制台报 type-uncompatible 警告
    width: {
      type: [Number, String],
      default: 50,
    },
    height: {
      type: [Number, String],
      default: 50,
    },
    mode: {
      type: String,
      default: "aspectFill",
    },
    qulity: {
      type: Number,
      default: 100,
    },
    unoss: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    safeWidth(): number {
      return Number(this.width) || 50;
    },
    safeHeight(): number {
      return Number(this.height) || 50;
    },
  },
  methods: {
    imageCenterCrop,
  },
});
</script>
