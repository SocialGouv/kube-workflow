{{- define "job" -}}

{{ $run := $.run }}
{{ $with := $.with }}
{{ $parentWith := $.parentWith }}
{{ $val := $.Values }}

{{ $user := "" }}
{{ if kindIs "invalid" $run.user }}
{{ $user = "1000" }}
{{ else }}
{{ $user = ($run.user | toString) }}
{{ end }}

{{ $group := "" }}
{{ if kindIs "invalid" $run.group }}
{{ $group = ($user | toString) }}
{{ else }}
{{ $group = $run.group }}
{{ end }}

{{ $fsGroup := "" }}
{{ if kindIs "invalid" $run.fsGroup }}
{{ $fsGroup = $user }}
{{ else }}
{{ $fsGroup = ($run.fsGroup | toString) }}
{{ end }}

---
apiVersion: batch/v1
kind: Job
metadata:
  name: job-{{ $val.global.namespace }}-{{ join "--" $run.scope }}
  namespace: {{ or $val.namespace $val.global.jobNamespace }}
  annotations:
    kapp.k14s.io/nonce: ""
    kapp.k14s.io/update-strategy: fallback-on-replace
    kapp.k14s.io/change-group: "autodevops/{{ $val.global.namespace }}"
    {{- range $scope := $run.scopes }}
    kapp.k14s.io/change-group.{{ $scope }}: "autodevops/{{ $scope }}.{{ $val.global.namespace }}"
    {{- end }}
    {{- range $need := $run.needs }}
    kapp.k14s.io/change-rule.{{ $need }}: "upsert after upserting autodevops/{{ $need }}.{{ $val.global.namespace }}"
    {{- end }}
    {{- range $need := $.Values.needs }}
    kapp.k14s.io/change-rule.{{ $need }}: "upsert after upserting autodevops/{{ $need }}.{{ $val.global.namespace }}"
    {{- end }}
    janitor/ttl: 1800
spec:
  backoffLimit: 2
  activeDeadlineSeconds: 3600
  ttlSecondsAfterFinished: 1800
  template:
    metadata:
      annotations:
      {{- if $run.annotations }}
      {{- range $key, $val := $run.annotations }}
        "{{ $key }}": "{{ $val }}"
      {{- end }}
      {{- end }}
      labels:
      {{- if $run.labels }}
      {{- range $key, $val := $run.labels }}
        "{{ $key }}": "{{ $val }}"
      {{- end }}
      {{- end }}
    spec:
      {{- if $run.serviceAccountName }}
      serviceAccountName: "{{ $run.serviceAccountName }}"
      {{- end }}
      restartPolicy: Never
      initContainers:
      {{- if or (not (hasKey $run "checkout")) $run.checkout }}
        - name: degit-repository
          image: node:17
          env:
            - name: npm_config_cache
              value: /tmp/npm-cache
          command:
            - sh
            - -c
            - |
              npx degit {{ or $val.repository $val.global.repository }}#{{ or $val.gitBranch $val.global.gitBranch }} \
                /workspace
          securityContext:
            runAsUser: 1000
            runAsGroup: 1000
            fsGroup: {{ or $run.fsGroup (or $run.user "1000") }}
          volumeMounts:
            - name: workspace
              mountPath: /workspace
      {{- end }}
      {{- if $run.action }}
        - name: degit-action
          image: node:17
          env:
            - name: npm_config_cache
              value: /tmp/npm-cache
          command:
            - sh
            - -c
            - npx degit {{ $run.action | replace "@" "#" }} /action
          securityContext:
            runAsUser: 1000
            runAsGroup: 1000
            fsGroup: {{ or $run.fsGroup (or $run.user "1000") }}
          volumeMounts:
            - name: action
              mountPath: /action
      {{- end }}
      containers:          
        - name: job
          image: "{{ or $run.image $.Values.image }}"
          imagePullPolicy: IfNotPresent
          workingDir: "{{ or $run.workingDir "/workspace" }}"
          {{- if $run.envFrom }}
          envFrom: {{ tpl ($run.envFrom | toJson) $ }}
          {{- end }}
          env:
            {{- if $run.env }}
              {{- tpl ($run.env | toYaml) $ | nindent 12 }}
            {{- end }}
            {{- range $name, $value := $run.vars }}
            - name: "{{ $name }}"
              value: "{{ tpl $value $ }}"
            {{- end }}
          
          {{- if or $run.entrypoint $run.run $run.action $run.outputs }}
          command:
            {{- if and $run.entrypoint }}
            {{- tpl ($run.entrypoint | toYaml) $ | nindent 12 }}
            {{- else }}
            - /bin/{{ or $run.shell "bash" }}
            - -c
            {{- end }}
            {{- if or $run.run $run.action $run.outputs }}
            - |
              {{- if $run.run }}
              {{- nindent 14 (tpl $run.run $) }}
              {{- else if $run.action }}
              /action/action.sh
              {{- end }}
              {{- if $run.outputs }}
              {{- range $output := $run.outputs }}
              mkdir -p "$(dirname /workflow/vars/{{ $run.name }}/{{ $output }})"
              echo "${{ $output }}">/workflow/vars/{{ $run.name }}/{{ $output }}
              {{- end }}
              {{- end }}
            {{- end }}
          {{- end }}
          {{- if $run.args }}
          args:
          {{- range $arg := $run.args }}
            - "{{ tpl $arg $ }}"
          {{- end }}
          {{- end }}
          securityContext:
            runAsUser: {{ $user }}
            runAsGroup: {{ $group }}
            fsGroup: {{ $fsGroup }}
          volumeMounts:
            - name: workspace
              mountPath: /workspace
            - name: action
              mountPath: /action
            - name: workflow
              mountPath: /workflow
              subPath: {{ $val.global.branchSlug }}/{{ $val.global.sha }}

      volumes:
        - name: workspace
          emptyDir: {}
        - name: action
          emptyDir: {}
        {{ if .Values.global.extra.jobs.sharedStorage.enabled }}
        - name: workflow
          persistentVolumeClaim:
            claimName: jobs-shared-storage
        {{- end }}
        {{- if $run.volumes }}
          {{- tpl ($run.volumes | toYaml) $ | nindent 8 }}
        {{- end }}

{{- end -}}