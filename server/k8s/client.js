import fs from 'fs';
import path from 'path';
import { KubeConfig, CoreV1Api, AppsV1Api, NetworkingV1Api, RbacAuthorizationV1Api, StorageV1Api, BatchV1Api } from '@kubernetes/client-node';
import { loadSettings } from './settings.js';

function getKubeconfigFiles() {
  const { kubeconfigDir } = loadSettings();
  if (!fs.existsSync(kubeconfigDir)) return [];
  return fs.readdirSync(kubeconfigDir)
    .filter(f => {
      const full = path.join(kubeconfigDir, f);
      return fs.statSync(full).isFile();
    })
    .map(f => path.join(kubeconfigDir, f));
}

export function listContexts() {
  const files = getKubeconfigFiles();
  const contexts = [];
  for (const filePath of files) {
    try {
      const kc = new KubeConfig();
      kc.loadFromFile(filePath);
      for (const ctx of kc.contexts) {
        contexts.push({
          name: ctx.name,
          cluster: ctx.cluster,
          file: path.basename(filePath),
          filePath,
        });
      }
    } catch (e) {
      contexts.push({ name: path.basename(filePath), error: e.message, filePath });
    }
  }
  return contexts;
}

export function makeClients(filePath, contextName) {
  const kc = new KubeConfig();
  kc.loadFromFile(filePath);
  if (contextName) kc.setCurrentContext(contextName);
  return {
    core: kc.makeApiClient(CoreV1Api),
    apps: kc.makeApiClient(AppsV1Api),
    networking: kc.makeApiClient(NetworkingV1Api),
    rbac: kc.makeApiClient(RbacAuthorizationV1Api),
    storage: kc.makeApiClient(StorageV1Api),
    batch: kc.makeApiClient(BatchV1Api),
  };
}

async function safe(fn) {
  try {
    const res = await fn();
    const obj = res.body ?? res;
    return { items: obj.items ?? [], error: null };
  } catch (e) {
    console.error('[k8s]', e.message);
    return { items: [], error: e.message };
  }
}

export async function getSecret(filePath, contextName, namespace, name) {
  const c = makeClients(filePath, contextName);
  try {
    const res = await c.core.readNamespacedSecret(name, namespace);
    return { item: res.body ?? res, error: null };
  } catch (e) {
    const msg = e.body?.message ?? e.message;
    console.error('[k8s]', msg);
    return { item: null, error: msg };
  }
}

export async function getResource(filePath, contextName, namespace, resourceKey) {
  const c = makeClients(filePath, contextName);
  const ns = namespace;
  switch (resourceKey) {
    case 'pods':             return safe(() => c.core.listNamespacedPod(ns));
    case 'deployments':      return safe(() => c.apps.listNamespacedDeployment(ns));
    case 'services':         return safe(() => c.core.listNamespacedService(ns));
    case 'nodes':            return safe(() => c.core.listNode());
    case 'replicaSets':      return safe(() => c.apps.listNamespacedReplicaSet(ns));
    case 'statefulSets':     return safe(() => c.apps.listNamespacedStatefulSet(ns));
    case 'daemonSets':       return safe(() => c.apps.listNamespacedDaemonSet(ns));
    case 'jobs':             return safe(() => c.batch.listNamespacedJob(ns));
    case 'cronJobs':         return safe(() => c.batch.listNamespacedCronJob(ns));
    case 'configMaps':       return safe(() => c.core.listNamespacedConfigMap(ns));
    case 'secrets': {
      try {
        const items = [];
        let continueToken = undefined;
        do {
          const res = await c.core.listNamespacedSecret(
            ns, undefined, undefined, continueToken, undefined, undefined, 50
          );
          const obj = res.body ?? res;
          for (const s of obj.items ?? []) {
            items.push({ metadata: s.metadata, type: s.type, _dataKeys: Object.keys(s.data ?? {}).length });
          }
          continueToken = obj.metadata?._continue || undefined;
        } while (continueToken);
        return { items, error: null };
      } catch (e) {
        console.error('[k8s] secrets:', e.message);
        return { items: [], error: e.message };
      }
    }
    case 'ingresses':        return safe(() => c.networking.listNamespacedIngress(ns));
    case 'pvcs':             return safe(() => c.core.listNamespacedPersistentVolumeClaim(ns));
    case 'pvs':              return safe(() => c.core.listPersistentVolume());
    case 'serviceAccounts':  return safe(() => c.core.listNamespacedServiceAccount(ns));
    case 'roles':            return safe(() => c.rbac.listNamespacedRole(ns));
    case 'roleBindings':     return safe(() => c.rbac.listNamespacedRoleBinding(ns));
    case 'clusterRoles':     return safe(() => c.rbac.listClusterRole());
    case 'clusterRoleBindings': return safe(() => c.rbac.listClusterRoleBinding());
    case 'storageClasses':   return safe(() => c.storage.listStorageClass());
    case 'endpoints':        return safe(() => c.core.listNamespacedEndpoints(ns));
    default: return { items: [], error: `Unknown resource: ${resourceKey}` };
  }
}

export async function getNamespaces(filePath, contextName) {
  const c = makeClients(filePath, contextName);
  return safe(() => c.core.listNamespace());
}

export async function getResources(filePath, contextName, namespace) {
  const c = makeClients(filePath, contextName);
  const ns = namespace;

  const [
    pods, deployments, services, nodes,
    replicaSets, statefulSets, daemonSets, jobs, cronJobs,
    configMaps, secrets, ingresses, pvcs, pvs,
    serviceAccounts, roles, roleBindings, clusterRoles, clusterRoleBindings,
    storageClasses, endpoints,
  ] = await Promise.all([
    safe(() => c.core.listNamespacedPod(ns)),
    safe(() => c.apps.listNamespacedDeployment(ns)),
    safe(() => c.core.listNamespacedService(ns)),
    safe(() => c.core.listNode()),
    safe(() => c.apps.listNamespacedReplicaSet(ns)),
    safe(() => c.apps.listNamespacedStatefulSet(ns)),
    safe(() => c.apps.listNamespacedDaemonSet(ns)),
    safe(() => c.batch.listNamespacedJob(ns)),
    safe(() => c.batch.listNamespacedCronJob(ns)),
    safe(() => c.core.listNamespacedConfigMap(ns)),
    safe(() => c.core.listNamespacedSecret(ns).then(res => {
      const obj = res.body ?? res;
      return { body: { ...obj, items: (obj.items ?? []).map(s => ({ ...s, _dataKeys: Object.keys(s.data ?? {}).length, data: undefined })) } };
    })),
    safe(() => c.networking.listNamespacedIngress(ns)),
    safe(() => c.core.listNamespacedPersistentVolumeClaim(ns)),
    safe(() => c.core.listPersistentVolume()),
    safe(() => c.core.listNamespacedServiceAccount(ns)),
    safe(() => c.rbac.listNamespacedRole(ns)),
    safe(() => c.rbac.listNamespacedRoleBinding(ns)),
    safe(() => c.rbac.listClusterRole()),
    safe(() => c.rbac.listClusterRoleBinding()),
    safe(() => c.storage.listStorageClass()),
    safe(() => c.core.listNamespacedEndpoints(ns)),
  ]);

  return {
    pods, deployments, services, nodes,
    replicaSets, statefulSets, daemonSets, jobs, cronJobs,
    configMaps, secrets, ingresses, pvcs, pvs,
    serviceAccounts, roles, roleBindings, clusterRoles, clusterRoleBindings,
    storageClasses, endpoints,
  };
}
