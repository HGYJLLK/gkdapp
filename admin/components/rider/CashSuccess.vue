<template>
  <a-modal
    title="确认提现成功"
    :visible="visible"
    ok-text="确认"
    cancel-text="取消"
    :confirm-loading="loading"
    :destroy-on-close="true"
    @ok="handleOk"
    @cancel="$emit('change', false)"
  >
    <div class="fo-9 mb-16">请确保已完成转账，并上传转账截图作为凭证</div>
    <Upload v-model="photoUrl" :width="120" :height="120" />
  </a-modal>
</template>
<script lang="ts">
import Vue from 'vue';
import Upload from '@/components/base/Upload/Upload.vue';
export default Vue.extend({
  components: { Upload },
  model: {
    prop: 'visible',
    event: 'change'
  },
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    no: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      loading: false,
      photoUrl: ''
    };
  },
  methods: {
    async handleOk() {
      if (!this.photoUrl) {
        (this as any).$message.error('请先上传转账截图');
        return;
      }
      this.loading = true;
      const res = await (this as any).$api.cashSuccess({
        cashNo: this.no,
        photoUrl: this.photoUrl
      });
      this.loading = false;
      if (res.code === 200) {
        (this as any).$message.success('操作成功');
        this.photoUrl = '';
        this.$emit('change', false);
        this.$emit('success');
      }
    }
  }
});
</script>
